/**
 * Business Analysis Agent
 *
 * Role: Analyzes the current state of the business, produces structured findings,
 * and separates provided facts from AI inference.
 *
 * Responsibilities:
 * - Evaluate business health across 8 dimensions
 * - Perform SWOT analysis
 * - Identify strengths, weaknesses, opportunities, threats
 * - Score each dimension with reasoning
 *
 * Constraints:
 * - Clearly distinguish PROVIDED facts from INFERRED conclusions
 * - Never present inference as fact
 * - Confidence scores reflect AI certainty in inferences
 */

import { z } from "zod";
import { callStructured, structuredModel } from "../provider";
import { ProvenanceEnum } from "../provenance";

// ─── Input Schema ────────────────────────────────────────

export const BusinessAnalysisInput = z.object({
  business: z.object({
    companyName: z.string(),
    industry: z.string(),
    size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]),
    location: z.string(),
    description: z.string().nullable(),
    goals: z.array(z.string()),
    challenges: z.array(z.string()),
  }),
  assessmentResponses: z
    .array(
      z.object({
        category: z.string(),
        question: z.string(),
        answer: z.string(),
        score: z.number(),
      })
    )
    .default([]),
});

export type BusinessAnalysisInput = z.infer<typeof BusinessAnalysisInput>;

// ─── Output Schema ───────────────────────────────────────

export const BusinessAnalysisOutput = z.object({
  healthScores: z.object({
    overall: z.number().min(0).max(100),
    digital: z.number().min(0).max(100),
    operational: z.number().min(0).max(100),
    financial: z.number().min(0).max(100),
    market: z.number().min(0).max(100),
    technology: z.number().min(0).max(100),
    humanCapital: z.number().min(0).max(100),
    customerExperience: z.number().min(0).max(100),
    innovation: z.number().min(0).max(100),
  }),
  swot: z.object({
    strengths: z.array(z.string()).min(1),
    weaknesses: z.array(z.string()).min(1),
    opportunities: z.array(z.string()).min(1),
    threats: z.array(z.string()).min(1),
  }),
  keyFindings: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
      source: ProvenanceEnum,
      confidence: z.number().min(0).max(1),
    })
  ),
  overallAssessment: z.string(),
  confidence: z.number().min(0).max(1),
});

export type BusinessAnalysisOutput = z.infer<typeof BusinessAnalysisOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Business Analysis Agent. Your job is to analyze a business's current state and produce structured findings.

CRITICAL RULES:
- Score health dimensions 0-100 based on provided data and reasonable inference
- Clearly mark each finding's source as PROVIDED (from user data) or INFERRED (AI analysis)
- For INFERRED findings, include a confidence score (0-1) and reasoning
- SWOT analysis should be based on actual provided information
- Do not invent statistics, revenue figures, or specific data points
- Be honest about uncertainty — if data is limited, reflect that in confidence scores

HEALTH DIMENSIONS:
1. Digital — Online presence, digital tools, e-commerce readiness
2. Operational — Business processes, efficiency, scalability
3. Financial — Revenue stability, cost management (infer only from provided context)
4. Market — Market position, competition, reach
5. Technology — Current tech stack, gaps, adoption
6. Human Capital — Team size, skills, training needs
7. Customer Experience — CX maturity, feedback systems
8. Innovation — R&D, new product development, adaptability

You are analyzing for a business growth advisory platform. Be realistic and constructive.`;

// ─── Agent Function ──────────────────────────────────────

export async function runBusinessAnalysis(
  input: BusinessAnalysisInput
): Promise<BusinessAnalysisOutput> {
  const validatedInput = BusinessAnalysisInput.parse(input);

  const assessmentSection =
    validatedInput.assessmentResponses.length > 0
      ? `\n\nAssessment Responses:\n${validatedInput.assessmentResponses
          .map((r) => `- [${r.category}] ${r.question}: "${r.answer}" (score: ${r.score})`)
          .join("\n")}`
      : "";

  const userPrompt = `Analyze the following business:

Company: ${validatedInput.business.companyName}
Industry: ${validatedInput.business.industry}
Size: ${validatedInput.business.size}
Location: ${validatedInput.business.location}
Description: ${validatedInput.business.description || "Not provided"}

Goals:
${validatedInput.business.goals.map((g) => `- ${g}`).join("\n")}

Challenges:
${validatedInput.business.challenges.map((c) => `- ${c}`).join("\n")}
${assessmentSection}

Produce a comprehensive business analysis with health scores, SWOT, and key findings.`;

  return callStructured(userPrompt, BusinessAnalysisOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    model: structuredModel(),
  });
}
