/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

import { prisma } from "@/lib/db/client";
import type { Opportunity, Prisma } from "@prisma/client";
import { getLatestAnalysis } from "@/lib/modules/analysis/service";
import {
  runOpportunityDiscovery,
  type OpportunityDiscoveryInput,
  type OpportunityDiscoveryOutput,
} from "@/lib/modules/ai/agents/opportunity-discovery";
import { AIValidationError } from "@/lib/modules/ai/types";

/** Max retries when AI output fails Zod validation */
const MAX_AI_RETRIES = 2;

/**
 * Get all opportunities for a business, ordered by priority then creation date.
 */
export async function getOpportunitiesByBusinessId(
  businessId: string
): Promise<Opportunity[]> {
  return prisma.opportunity.findMany({
    where: { businessId },
    orderBy: [{ createdAt: "desc" }],
  });
}

/**
 * Run the Opportunity Discovery pipeline for a business.
 *
 * Pipeline:
 *   1. Retrieve the latest BusinessAnalysis for this business
 *   2. Build the exact OpportunityDiscoveryInput expected by the agent
 *   3. Call the existing runOpportunityDiscovery() agent (→ Gemini → Zod validation)
 *   4. Application-level validation of the AI output
 *   5. Remove previous opportunities generated from THIS analysis (dedup)
 *   6. Persist validated Opportunity records
 *
 * Dedup strategy: When re-run against the same BusinessAnalysis, previous
 * opportunities linked to that analysis are replaced. Opportunities from
 * different analyses are preserved. This prevents uncontrolled duplicates
 * while maintaining historical data from earlier analyses.
 *
 * Returns the persisted opportunities.
 * Throws descriptive errors for missing prerequisites or AI failures.
 */
export async function discoverOpportunitiesForBusiness(
  businessId: string
): Promise<Opportunity[]> {
  // 1. Retrieve the latest BusinessAnalysis for this business
  const analysis = await getLatestAnalysis(businessId);
  if (!analysis) {
    throw new Error("No business analysis found. Run analysis first.");
  }

  // Extract the analysis data needed for the agent input
  const analysisData = analysis.analysisData as Record<string, unknown>;
  const healthScores = analysis.healthScores as Record<string, number>;

  // Build SWOT from the analysis data
  // Support both nested format (AI agent: analysisData.swot) and
  // flat format (seed data: analysisData.strengths directly)
  const nestedSwot = analysisData.swot as
    | { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
    | undefined;
  const flatStrengths = analysisData.strengths as string[] | undefined;

  const swot = nestedSwot ?? (
    flatStrengths
      ? {
          strengths: flatStrengths,
          weaknesses: (analysisData.weaknesses as string[]) ?? [],
          opportunities: (analysisData.opportunities as string[]) ?? [],
          threats: (analysisData.threats as string[]) ?? [],
        }
      : undefined
  );

  if (!swot) {
    throw new Error("Business analysis is missing SWOT data. Re-run analysis.");
  }

  // Build key findings (the agent only needs title, description, category)
  const keyFindings = (analysisData.keyFindings as Array<Record<string, unknown>>) ?? [];

  // Retrieve the business profile for the input
  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessId },
  });
  if (!profile) {
    throw new Error("Business profile not found");
  }

  // 2. Build the exact input expected by the existing AI agent
  const input: OpportunityDiscoveryInput = {
    business: {
      companyName: profile.companyName,
      industry: profile.industry,
      size: profile.size,
      location: profile.location,
      goals: profile.goals,
      challenges: profile.challenges,
    },
    analysis: {
      healthScores,
      swot: {
        strengths: swot.strengths,
        weaknesses: swot.weaknesses,
        opportunities: swot.opportunities,
        threats: swot.threats,
      },
      keyFindings: keyFindings.map((f) => ({
        title: String(f.title ?? ""),
        description: String(f.description ?? ""),
        category: String(f.category ?? ""),
      })),
    },
  };

  // 3. Call the existing AI agent — goes through provider abstraction → Gemini
  //    The agent internally validates input + output with Zod schemas.
  //    Retry up to MAX_AI_RETRIES times if AI output fails validation.
  let output: OpportunityDiscoveryOutput | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt++) {
    try {
      output = await runOpportunityDiscovery(input);
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      if (err instanceof AIValidationError && attempt < MAX_AI_RETRIES) {
        console.warn(
          `Opportunity discovery attempt ${attempt}/${MAX_AI_RETRIES} failed validation, retrying...`
        );
        continue;
      }
      throw err;
    }
  }

  if (!output) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Opportunity discovery failed after retries");
  }

  // 4. Application-level validation
  if (!output.opportunities || output.opportunities.length === 0) {
    throw new Error("AI did not identify any opportunities.");
  }

  // Validate each opportunity has required fields for persistence
  for (const opp of output.opportunities) {
    if (!opp.title || !opp.category || !opp.priority) {
      throw new Error("AI output contains an opportunity missing required fields.");
    }
  }

  // 5. Dedup: remove previous opportunities generated from THIS analysis
  //    This prevents uncontrolled duplicates on re-runs while preserving
  //    opportunities from earlier/different analyses.
  await prisma.opportunity.deleteMany({
    where: { analysisId: analysis.id },
  });

  // 6. Persist validated opportunities — all IDs from trusted server data
  const createdOpps = await prisma.opportunity.createManyAndReturn({
    data: output.opportunities.map((opp) => ({
      businessId,
      analysisId: analysis.id,
      title: opp.title,
      category: opp.category,
      priority: opp.priority,
      confidence: opp.confidence,
      status: "IDENTIFIED" as const,
      details: {
        impact: opp.impact,
        feasibility: opp.feasibility,
        description: opp.description,
        reasoning: opp.reasoning,
        estimatedTimeline: opp.estimatedTimeline ?? null,
        estimatedInvestment: opp.estimatedInvestment ?? null,
        requiredCapabilities: opp.requiredCapabilities,
        source: opp.source,
      } satisfies Record<string, unknown> as Prisma.InputJsonValue,
    })),
  });

  return createdOpps;
}
