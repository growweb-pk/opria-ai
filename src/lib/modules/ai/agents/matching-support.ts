/**
 * Professional Matching Support Agent
 *
 * Role: Compares structured requirements with professional profiles and provides
 * semantic relevance analysis for each professional.
 *
 * Responsibilities:
 * - Analyze each professional profile against the structured requirement
 * - Score semantic relevance (0-100)
 * - Identify skill overlaps and gaps
 * - Provide reasoning for scores
 *
 * Constraints:
 * - Use ONLY information actually available in the professional profile
 * - NEVER invent experience, clients, skills, certifications, or portfolio work
 * - If a profile is sparse, reflect that in confidence scores
 * - Do not make assumptions about capabilities not documented in the profile
 */

import { z } from "zod";
import { callStructured, structuredModel } from "../provider";

// ─── Input Schema ────────────────────────────────────────

export const MatchingSupportInput = z.object({
  requirement: z.object({
    title: z.string(),
    summary: z.string(),
    goals: z.array(z.object({ description: z.string() })),
    requirements: z.array(
      z.object({
        category: z.string(),
        description: z.string(),
        priority: z.string(),
      })
    ),
    professionalCategories: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        requiredSkills: z.array(z.string()),
      })
    ),
    budget: z.object({ estimated: z.string().optional() }).optional(),
  }),
  professionals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      title: z.string(),
      skills: z.array(z.string()),
      services: z.array(z.string()),
      certifications: z.array(z.string()),
      industryExpertise: z.array(z.string()),
      bio: z.string().nullable(),
      hourlyRate: z.number().nullable(),
      projectMinBudget: z.number().nullable(),
      projectMaxBudget: z.number().nullable(),
      reputation: z.number(),
    })
  ),
});

export type MatchingSupportInput = z.infer<typeof MatchingSupportInput>;

// ─── Output Schema ───────────────────────────────────────

export const MatchingSupportOutput = z.object({
  results: z.array(
    z.object({
      professionalId: z.string(),
      aiScore: z.number().min(0).max(100),
      skillOverlap: z.array(z.string()),
      skillGaps: z.array(z.string()),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  summary: z.string(),
});

export type MatchingSupportOutput = z.infer<typeof MatchingSupportOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Professional Matching Support Agent. Your job is to analyze how well professional profiles match a structured business requirement.

CRITICAL RULES:
- Use ONLY information actually present in the professional profile
- NEVER invent experience, clients, skills, certifications, portfolio work, or results
- If a profile has limited information, reflect that in a lower confidence score
- Score semantic relevance 0-100 based on actual profile data
- Skill overlap = skills the professional has that the requirement needs
- Skill gaps = skills the requirement needs that the professional profile doesn't mention
- Strengths should be based on documented qualifications
- Weaknesses should be about missing documented qualifications, not assumed deficiencies

SCORING GUIDELINES:
- 90-100: Exceptional match — skills, experience, industry expertise all align
- 70-89: Strong match — most requirements covered, minor gaps
- 50-69: Moderate match — some alignment but notable gaps
- 30-49: Weak match — limited relevance
- 0-29: Poor match — minimal or no alignment

Be honest. A 45 score with clear reasoning is better than an inflated 80.`;

// ─── Agent Function ──────────────────────────────────────

export async function runMatchingSupport(
  input: MatchingSupportInput
): Promise<MatchingSupportOutput> {
  const validatedInput = MatchingSupportInput.parse(input);

  const userPrompt = `Analyze how well each professional matches the following requirement:

REQUIREMENT:
Title: ${validatedInput.requirement.title}
Summary: ${validatedInput.requirement.summary}

Goals:
${validatedInput.requirement.goals.map((g) => `- ${g.description}`).join("\n")}

Requirements:
${validatedInput.requirement.requirements
  .map((r) => `- [${r.category}] (${r.priority}) ${r.description}`)
  .join("\n")}

Needed Professional Categories:
${validatedInput.requirement.professionalCategories
  .map((c) => `- ${c.name}: ${c.description} (skills: ${c.requiredSkills.join(", ")})`)
  .join("\n")}

Budget: ${validatedInput.requirement.budget?.estimated || "Not specified"}

PROFESSIONALS TO EVALUATE:
${validatedInput.professionals
  .map(
    (p) => `
--- ${p.name} (ID: ${p.id}) ---
Title: ${p.title}
Skills: ${p.skills.join(", ") || "None listed"}
Services: ${p.services.join(", ") || "None listed"}
Certifications: ${p.certifications.join(", ") || "None listed"}
Industry Expertise: ${p.industryExpertise.join(", ") || "None listed"}
Bio: ${p.bio || "Not provided"}
Hourly Rate: ${p.hourlyRate ? `$${p.hourlyRate}/hr` : "Not specified"}
Budget Range: ${p.projectMinBudget && p.projectMaxBudget ? `$${p.projectMinBudget}-$${p.projectMaxBudget}` : "Not specified"}
Reputation: ${p.reputation}/5`
  )
  .join("\n")}

Evaluate each professional against the requirement. Return results with AI scores, skill analysis, and reasoning.`;

  return callStructured(userPrompt, MatchingSupportOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    model: structuredModel(),
  });
}
