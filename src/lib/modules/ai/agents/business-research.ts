/**
 * Business Research Agent
 *
 * Role: Understands provided business information, structures the business profile,
 * identifies missing information, and does NOT invent facts.
 *
 * Responsibilities:
 * - Parse and validate user-provided business data
 * - Structure the profile into consistent categories
 * - Identify gaps in information
 * - Suggest what additional information would be useful
 *
 * Constraints:
 * - NEVER invent business facts, goals, or challenges
 * - All output provenance = PROVIDED (user-supplied data)
 * - May mark fields as "incomplete" but must not fill them with AI guesses
 */

import { z } from "zod";
import { callStructured, structuredModel } from "../provider";

// ─── Input Schema ────────────────────────────────────────

export const BusinessResearchInput = z.object({
  companyName: z.string(),
  industry: z.string(),
  size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]),
  location: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  goals: z.array(z.string()).default([]),
  challenges: z.array(z.string()).default([]),
});

export type BusinessResearchInput = z.infer<typeof BusinessResearchInput>;

// ─── Output Schema ───────────────────────────────────────

export const BusinessResearchOutput = z.object({
  structuredProfile: z.object({
    companyName: z.string(),
    industry: z.string(),
    industrySubcategory: z.string().optional(),
    size: z.string(),
    location: z.string(),
    locationType: z.enum(["urban", "suburban", "rural", "online", "hybrid"]).optional(),
    website: z.string().nullable(),
    description: z.string().nullable(),
    goals: z.array(z.string()),
    challenges: z.array(z.string()),
  }),
  missingInformation: z.array(
    z.object({
      field: z.string(),
      importance: z.enum(["critical", "important", "nice-to-have"]),
      reason: z.string(),
    })
  ),
  suggestedNextSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type BusinessResearchOutput = z.infer<typeof BusinessResearchOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Business Research Agent. Your job is to analyze and structure business information provided by a business owner.

CRITICAL RULES:
- Only use information explicitly provided by the user
- NEVER invent facts, statistics, goals, or challenges
- If information is missing, mark it as missing — do not fill in with assumptions
- Structure the data into consistent categories
- Identify what additional information would help understand the business better
- Be concise and factual

You are analyzing business data for a business growth advisory platform. Your structured output will be used by other AI agents and displayed in the business dashboard.`;

// ─── Agent Function ──────────────────────────────────────

export async function runBusinessResearch(
  input: BusinessResearchInput
): Promise<BusinessResearchOutput> {
  const validatedInput = BusinessResearchInput.parse(input);

  const userPrompt = `Analyze and structure the following business information:

Company: ${validatedInput.companyName}
Industry: ${validatedInput.industry}
Size: ${validatedInput.size}
Location: ${validatedInput.location}
Website: ${validatedInput.website || "Not provided"}
Description: ${validatedInput.description || "Not provided"}

Goals:
${validatedInput.goals.length > 0 ? validatedInput.goals.map((g) => `- ${g}`).join("\n") : "None provided"}

Challenges:
${validatedInput.challenges.length > 0 ? validatedInput.challenges.map((c) => `- ${c}`).join("\n") : "None provided"}

Identify any missing information that would be useful for business advisory purposes.`;

  return callStructured(userPrompt, BusinessResearchOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.2, // Low creativity — we want precise structuring
    model: structuredModel(),
  });
}
