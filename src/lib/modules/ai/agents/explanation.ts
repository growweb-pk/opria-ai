/**
 * Recommendation Explanation Agent
 *
 * Role: Explains why a professional was recommended for a specific business requirement.
 * Bases explanations on actual stored data and matching results.
 *
 * Responsibilities:
 * - Generate human-readable explanations for match results
 * - Reference actual skills, experience, and scores from stored data
 * - Explain the scoring breakdown in accessible language
 *
 * Constraints:
 * - NEVER invent experience, clients, skills, certifications, or portfolio work
 * - Base explanations ONLY on actual stored data and matching results
 * - If data is limited, be transparent about it
 * - Do not fabricate case studies, testimonials, or past projects
 */

import { z } from "zod";
import { callStructured } from "../provider";

// ─── Input Schema ────────────────────────────────────────

export const ExplanationInput = z.object({
  requirement: z.object({
    title: z.string(),
    summary: z.string(),
    goals: z.array(z.object({ description: z.string() })),
    professionalCategories: z.array(
      z.object({
        name: z.string(),
        requiredSkills: z.array(z.string()),
      })
    ),
  }),
  professional: z.object({
    name: z.string(),
    title: z.string(),
    skills: z.array(z.string()),
    services: z.array(z.string()),
    certifications: z.array(z.string()),
    industryExpertise: z.array(z.string()),
    bio: z.string().nullable(),
    hourlyRate: z.number().nullable(),
    reputation: z.number(),
  }),
  matchResult: z.object({
    structuredScore: z.number(),
    aiScore: z.number(),
    finalScore: z.number(),
    rank: z.number(),
    skillOverlap: z.array(z.string()).default([]),
    skillGaps: z.array(z.string()).default([]),
    strengths: z.array(z.string()).default([]),
  }),
  businessName: z.string(),
});

export type ExplanationInput = z.infer<typeof ExplanationInput>;

// ─── Output Schema ───────────────────────────────────────

export const ExplanationOutput = z.object({
  headline: z.string(),
  shortExplanation: z.string(), // 1-2 sentence summary
  detailedExplanation: z.string(), // Full explanation paragraph
  keyMatches: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
    })
  ),
  areasOfCaution: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});

export type ExplanationOutput = z.infer<typeof ExplanationOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Recommendation Explanation Agent. Your job is to explain why a professional was recommended for a specific business requirement.

CRITICAL RULES:
- Base explanations ONLY on actual stored data in the professional profile and match results
- NEVER invent experience, past clients, case studies, testimonials, skills, certifications, or portfolio work
- NEVER fabricate project history or results the professional has achieved
- Reference actual skills, certifications, and services listed in the profile
- If the profile is sparse, be transparent: "Based on the limited information available..."
- Explain the scoring breakdown in plain, accessible language
- Be honest about weaknesses or gaps — do not sugarcoat

EXPLANATION STYLE:
- Headline: Short, compelling (e.g., "Strong match for e-commerce development")
- Short explanation: 1-2 sentences for quick scanning
- Detailed explanation: Full paragraph covering match reasoning
- Key matches: Specific points of alignment between requirement and profile
- Areas of caution: Honest assessment of gaps or unknowns

Write for a business owner who needs to understand why this professional might be right for them.`;

// ─── Agent Function ──────────────────────────────────────

export async function runExplanation(
  input: ExplanationInput
): Promise<ExplanationOutput> {
  const validatedInput = ExplanationInput.parse(input);
  const { requirement, professional, matchResult, businessName } = validatedInput;

  const userPrompt = `Explain why ${professional.name} was recommended for "${requirement.title}" at ${businessName}.

BUSINESS REQUIREMENT:
Title: ${requirement.title}
Summary: ${requirement.summary}
Goals: ${requirement.goals.map((g) => g.description).join("; ")}
Needed Categories: ${requirement.professionalCategories.map((c) => `${c.name} (skills: ${c.requiredSkills.join(", ")})`).join("; ")}

PROFESSIONAL PROFILE:
Name: ${professional.name}
Title: ${professional.title}
Skills: ${professional.skills.join(", ") || "None listed"}
Services: ${professional.services.join(", ") || "None listed"}
Certifications: ${professional.certifications.join(", ") || "None listed"}
Industry Expertise: ${professional.industryExpertise.join(", ") || "None listed"}
Bio: ${professional.bio || "Not provided"}
Hourly Rate: ${professional.hourlyRate ? `$${professional.hourlyRate}/hr` : "Not specified"}
Reputation: ${professional.reputation}/5

MATCH SCORING:
Structured Score: ${matchResult.structuredScore}/100
AI Semantic Score: ${matchResult.aiScore}/100
Final Score: ${matchResult.finalScore}/100
Rank: #${matchResult.rank}
Skill Overlap: ${matchResult.skillOverlap.join(", ") || "None identified"}
Skill Gaps: ${matchResult.skillGaps.join(", ") || "None identified"}
Strengths: ${matchResult.strengths.join(", ") || "None identified"}

Generate a clear, honest explanation based ONLY on the data above.`;

  return callStructured(userPrompt, ExplanationOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.5, // Moderate creativity for natural explanations
  });
}
