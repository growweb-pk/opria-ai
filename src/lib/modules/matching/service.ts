/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

/**
 * Matching Service (Phase 5)
 *
 * Orchestrates the hybrid matching pipeline from Blueprint §14.1:
 *   Phase 1 Filter → Phase 2 Structured Scoring → Phase 3 AI Semantic →
 *   Phase 4 Composite Ranking (70/30) → Phase 5 Explanation → Persist.
 *
 * Security:
 *   - businessId is ALWAYS resolved server-side from the authenticated user.
 *   - Requirement / MatchRequest ownership is verified on every operation.
 *   - MatchResult access is chained through business → requirement → request.
 *   - Professional profiles are read as the shared professional pool (public
 *     profile fields only); no other business's private data is exposed.
 *
 * AI cost control:
 *   - The AI Matching Support stage is a SINGLE batched call for the whole
 *     candidate set (runMatchingSupport accepts an array of professionals).
 *   - Explanations reuse the reasoning returned by that one call — no separate
 *     per-professional explanation AI calls.
 *   - If AI is unavailable/fails, a deterministic structured-only fallback is
 *     persisted so the flow never breaks.
 *   - The seeded/demo recommendations path performs ZERO AI calls (it reads
 *     already-persisted MatchResults).
 */

import { prisma } from "@/lib/db/client";
import { getBusinessProfile } from "@/lib/modules/business/service";
import {
  runMatchingSupport,
  type MatchingSupportInput,
} from "@/lib/modules/ai/agents/matching-support";
import { Prisma, type MatchRequest, type Requirement } from "@prisma/client";
import {
  COMPOSITE_WEIGHTS,
  computeFinalScore,
  filterEligibleProfessionals,
  parseBudgetRange,
  rankCandidates,
  scoreProfessionalStructured,
  type RequirementMatchContext,
} from "./scorer";

// Top candidates sent to the AI semantic stage (Blueprint §12.3: top 10 advance)
const AI_CANDIDATE_LIMIT = 10;
// Final ranked results persisted & shown (Blueprint §14.1: return top 5)
const FINAL_RESULT_LIMIT = 5;

// ─── Types ───────────────────────────────────────────────

interface StructuredRequirement {
  summary?: string;
  goals?: Array<{ description: string }>;
  requirements?: Array<{ category: string; description: string; priority: string }>;
  professionalCategories?: Array<{
    name: string;
    description?: string;
    requiredSkills?: string[];
    priority?: string;
  }>;
  budget?: { estimated?: string; range?: string };
}

export type RecommendationRequirement = Requirement & {
  matchRequests: Array<
    MatchRequest & {
      matchResults: Array<{
        id: string;
        structuredScore: number;
        aiScore: number;
        finalScore: number;
        rank: number;
        scoreBreakdown: Prisma.JsonValue;
        explanation: Prisma.JsonValue;
        professional: {
          id: string;
          name: string;
          title: string;
          skills: string[];
          services: string[];
          certifications: string[];
          industryExpertise: string[];
          bio: string | null;
          hourlyRate: number | null;
          projectMinBudget: number | null;
          projectMaxBudget: number | null;
          reputation: number;
          availability: string;
          verification: string;
        };
      }>;
    }
  >;
};

// ─── Internal helpers ────────────────────────────────────

async function resolveBusiness(userId: string) {
  const business = await getBusinessProfile(userId);
  if (!business) {
    throw new Error("Business profile not found");
  }
  return business;
}

async function getOwnedRequirement(userId: string, requirementId: string) {
  const business = await resolveBusiness(userId);
  // Ownership is enforced here: the requirement MUST belong to this business.
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, businessId: business.id },
  });
  if (!requirement) {
    throw new Error("Requirement not found");
  }
  return { business, requirement };
}

function buildMatchContext(
  requirement: Requirement,
  businessIndustry: string
): { ctx: RequirementMatchContext; structured: StructuredRequirement } {
  const structured = (requirement.structuredData ?? {}) as StructuredRequirement;

  const requiredSkillsSet = new Set<string>();
  for (const category of structured.professionalCategories ?? []) {
    for (const skill of category.requiredSkills ?? []) {
      const trimmed = skill.trim();
      if (trimmed) requiredSkillsSet.add(trimmed);
    }
  }

  const budgetText =
    structured.budget?.estimated ?? structured.budget?.range ?? null;
  const { min, max } = parseBudgetRange(budgetText);

  return {
    ctx: {
      requiredSkills: Array.from(requiredSkillsSet),
      businessIndustry,
      budgetMin: min,
      budgetMax: max,
    },
    structured,
  };
}

function deriveHeadline(finalScore: number): string {
  if (finalScore >= 75) return "Strong match";
  if (finalScore >= 50) return "Moderate match";
  return "Partial match";
}

// ─── Public API ──────────────────────────────────────────

/**
 * Run (or reuse) the matching pipeline for an approved requirement.
 * Idempotent: a completed MatchRequest is returned as-is without re-running
 * or creating duplicates.
 */
export async function runMatchingForRequirement(
  userId: string,
  requirementId: string
): Promise<MatchRequest> {
  const { business, requirement } = await getOwnedRequirement(
    userId,
    requirementId
  );

  // Eligibility: only APPROVED / MATCHING / MATCHED requirements can be matched.
  if (
    requirement.status !== "APPROVED" &&
    requirement.status !== "MATCHING" &&
    requirement.status !== "MATCHED"
  ) {
    throw new Error("Requirement must be approved before matching");
  }

  // Idempotency: reuse an existing completed match request (no duplicate work).
  const completed = await prisma.matchRequest.findFirst({
    where: {
      requirementId: requirement.id,
      businessId: business.id,
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
  });
  if (completed) {
    return completed;
  }

  // One match request per requirement — reuse a pending/failed one if present.
  let matchRequest = await prisma.matchRequest.findFirst({
    where: { requirementId: requirement.id, businessId: business.id },
    orderBy: { createdAt: "desc" },
  });
  if (matchRequest) {
    matchRequest = await prisma.matchRequest.update({
      where: { id: matchRequest.id },
      data: { status: "PROCESSING" },
    });
    await prisma.matchResult.deleteMany({
      where: { matchRequestId: matchRequest.id },
    });
  } else {
    matchRequest = await prisma.matchRequest.create({
      data: {
        requirementId: requirement.id,
        businessId: business.id,
        status: "PROCESSING",
      },
    });
  }

  const { ctx, structured } = buildMatchContext(
    requirement,
    business.industry
  );

  // Phase 1 + 2: filter the shared professional pool, then score deterministically.
  const allProfessionals = await prisma.professionalProfile.findMany();
  const eligible = filterEligibleProfessionals(allProfessionals, ctx);

  const scored = eligible.map((professional) => {
    const result = scoreProfessionalStructured(professional, ctx);
    return { professional, structuredResult: result };
  });

  // Advance the top structured candidates to the AI semantic stage.
  scored.sort((a, b) => b.structuredResult.structuredScore - a.structuredResult.structuredScore);
  const aiCandidates = scored.slice(0, AI_CANDIDATE_LIMIT);

  // Phase 3: SINGLE batched AI call for the whole candidate set.
  let aiByProfessionalId = new Map<
    string,
    {
      aiScore: number;
      skillOverlap: string[];
      skillGaps: string[];
      strengths: string[];
      weaknesses: string[];
      reasoning: string;
      confidence: number;
    }
  >();
  let aiSummary: string | null = null;
  let aiUsed = false;

  if (aiCandidates.length > 0) {
    try {
      const aiInput: MatchingSupportInput = {
        requirement: {
          title: requirement.title,
          summary: structured.summary ?? "",
          goals: (structured.goals ?? []).map((g) => ({ description: g.description })),
          requirements: (structured.requirements ?? []).map((r) => ({
            category: r.category,
            description: r.description,
            priority: r.priority,
          })),
          professionalCategories: (structured.professionalCategories ?? []).map((c) => ({
            name: c.name,
            description: c.description ?? "",
            requiredSkills: c.requiredSkills ?? [],
          })),
          budget: structured.budget?.estimated
            ? { estimated: structured.budget.estimated }
            : undefined,
        },
        professionals: aiCandidates.map(({ professional }) => ({
          id: professional.id,
          name: professional.name,
          title: professional.title,
          skills: professional.skills,
          services: professional.services,
          certifications: professional.certifications,
          industryExpertise: professional.industryExpertise,
          bio: professional.bio,
          hourlyRate: professional.hourlyRate,
          projectMinBudget: professional.projectMinBudget,
          projectMaxBudget: professional.projectMaxBudget,
          reputation: professional.reputation,
        })),
      };

      const aiOutput = await runMatchingSupport(aiInput);
      aiUsed = true;
      aiSummary = aiOutput.summary ?? null;
      for (const r of aiOutput.results) {
        aiByProfessionalId.set(r.professionalId, {
          aiScore: r.aiScore,
          skillOverlap: r.skillOverlap ?? [],
          skillGaps: r.skillGaps ?? [],
          strengths: r.strengths ?? [],
          weaknesses: r.weaknesses ?? [],
          reasoning: r.reasoning ?? "",
          confidence: r.confidence ?? 0,
        });
      }
    } catch (error) {
      // Deterministic fallback: never break matching when AI is unavailable.
      console.error("Matching AI stage failed — using structured fallback:", error);
      aiByProfessionalId = new Map();
      aiUsed = false;
    }
  }

  // Phase 4: composite ranking (70% structured + 30% AI).
  const ranked = rankCandidates(
    scored.map(({ professional, structuredResult }) => {
      const ai = aiByProfessionalId.get(professional.id);
      // Fallback AI score = structured score (keeps composite stable & honest).
      const aiScore = ai ? ai.aiScore : structuredResult.structuredScore;
      return {
        professionalId: professional.id,
        professional,
        structuredResult,
        aiScore,
        ai,
        finalScore: computeFinalScore(structuredResult.structuredScore, aiScore),
      };
    })
  ).slice(0, FINAL_RESULT_LIMIT);

  // Phase 5 + persistence: assemble explanations (reusing AI reasoning) and store.
  if (ranked.length > 0) {
    await prisma.matchResult.createMany({
      data: ranked.map((candidate) => {
        const { professional, structuredResult, aiScore, ai, finalScore, rank } =
          candidate;
        const explanation = {
          headline: deriveHeadline(finalScore),
          skillOverlap: ai?.skillOverlap ?? [],
          skillGaps: ai?.skillGaps ?? [],
          strengths: ai?.strengths ?? [],
          weaknesses: ai?.weaknesses ?? [],
          reasoning:
            ai?.reasoning ??
            `${professional.name} was ranked by deterministic structured scoring across skill match, industry experience, reputation, portfolio, availability, budget fit, and verification status.`,
          confidence: ai?.confidence ?? null,
          source: aiUsed && ai ? "ai" : "structured-fallback",
        };

        const scoreBreakdown = {
          factors: structuredResult.factors,
          structuredScore: structuredResult.structuredScore,
          aiScore,
          finalScore,
          weights: {
            structured: COMPOSITE_WEIGHTS.structured,
            ai: COMPOSITE_WEIGHTS.ai,
          },
          // Seed-compatible flat 0-100 keys so one UI renders seeded + live data.
          ...structuredResult.breakdown,
        };

        return {
          matchRequestId: matchRequest!.id,
          professionalId: professional.id,
          structuredScore: structuredResult.structuredScore,
          aiScore,
          finalScore,
          rank,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          explanation: explanation as unknown as Prisma.InputJsonValue,
        };
      }),
    });
  }

  // Finalize the match request with traceability metadata.
  const finalized = await prisma.matchRequest.update({
    where: { id: matchRequest.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      results: {
        method: "hybrid",
        structuredWeight: COMPOSITE_WEIGHTS.structured,
        aiWeight: COMPOSITE_WEIGHTS.ai,
        totalCandidates: eligible.length,
        aiUsed,
        aiSummary,
        generatedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Mark the requirement as matched.
  await prisma.requirement.update({
    where: { id: requirement.id },
    data: { status: "MATCHED" },
  });

  return finalized;
}

/**
 * Load persisted recommendations for the authenticated business.
 * Reads existing MatchRequest/MatchResult rows — performs NO AI calls, so the
 * seeded/demo data renders immediately.
 */
export async function getRecommendationsForBusinessUser(
  userId: string
): Promise<RecommendationRequirement[]> {
  const business = await resolveBusiness(userId);

  return prisma.requirement.findMany({
    where: {
      businessId: business.id,
      status: { in: ["APPROVED", "MATCHING", "MATCHED"] },
      // Only surface requirements where matching has actually been initiated,
      // so stale approved-but-never-matched requirements don't clutter the page.
      matchRequests: { some: {} },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      matchRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          matchResults: {
            orderBy: { rank: "asc" },
            include: { professional: true },
          },
        },
      },
    },
  }) as Promise<RecommendationRequirement[]>;
}
