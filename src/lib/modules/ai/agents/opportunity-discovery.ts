/**
 * Opportunity Discovery Agent
 *
 * Role: Identifies potential business, digital, and technology opportunities,
 * prioritizes them, and explains why each opportunity is relevant.
 *
 * Responsibilities:
 * - Analyze business profile and analysis to find growth opportunities
 * - Categorize opportunities (digital, operational, market, technology)
 * - Prioritize based on impact and feasibility
 * - Explain reasoning for each opportunity
 *
 * Constraints:
 * - Opportunities must be grounded in the actual business data
 * - Never invent business capabilities or market conditions
 * - Confidence scores must reflect actual certainty
 */

import { z } from "zod";
import { callStructured } from "../provider";
import { ProvenanceEnum } from "../provenance";

// ─── Input Schema ────────────────────────────────────────

export const OpportunityDiscoveryInput = z.object({
  business: z.object({
    companyName: z.string(),
    industry: z.string(),
    size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]),
    location: z.string(),
    goals: z.array(z.string()),
    challenges: z.array(z.string()),
  }),
  analysis: z.object({
    healthScores: z.record(z.string(), z.number()),
    swot: z.object({
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    }),
    keyFindings: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        category: z.string(),
      })
    ),
  }),
});

export type OpportunityDiscoveryInput = z.infer<typeof OpportunityDiscoveryInput>;

// ─── Output Schema ───────────────────────────────────────

// Preprocess helpers: Gemini sometimes confuses enum values
const normalizePriority = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const map: Record<string, string> = {
    high: "IMMEDIATE",
    critical: "IMMEDIATE",
    medium: "SHORT_TERM",
    low: "MEDIUM_TERM",
  };
  return map[val.toLowerCase()] ?? val;
};

const normalizeFeasibility = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const map: Record<string, string> = {
    high: "easy",
    easy: "easy",
    medium: "moderate",
    moderate: "moderate",
    low: "challenging",
    difficult: "challenging",
    hard: "challenging",
  };
  return map[val.toLowerCase()] ?? val;
};

const normalizeImpact = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const map: Record<string, string> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    moderate: "medium",
    low: "low",
    minimal: "low",
  };
  return map[val.toLowerCase()] ?? val;
};

export const OpportunityDiscoveryOutput = z.object({
  opportunities: z.array(
    z.object({
      title: z.string(),
      category: z.enum([
        "digital_transformation",
        "market_expansion",
        "operational_efficiency",
        "technology_adoption",
        "customer_experience",
        "revenue_diversification",
        "brand_and_marketing",
        "human_capital",
      ]),
      priority: z.preprocess(
        normalizePriority,
        z.enum(["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"])
      ),
      impact: z.preprocess(
        normalizeImpact,
        z.enum(["low", "medium", "high", "critical"])
      ),
      feasibility: z.preprocess(
        normalizeFeasibility,
        z.enum(["easy", "moderate", "challenging"])
      ),
      description: z.string().default(""),
      reasoning: z.string().default(""),
      estimatedTimeline: z.string().optional(),
      estimatedInvestment: z.string().optional(),
      requiredCapabilities: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).default(0.5),
      source: ProvenanceEnum.default("INFERRED"),
    })
  ),
  summary: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type OpportunityDiscoveryOutput = z.infer<typeof OpportunityDiscoveryOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Opportunity Discovery Agent. Your job is to identify realistic growth opportunities for a business based on its profile and analysis.

CRITICAL RULES:
- Opportunities must be grounded in the actual business data provided
- NEVER invent capabilities the business doesn't have
- NEVER invent market conditions or statistics
- Prioritize opportunities based on impact AND feasibility for a business of this size
- Explain WHY each opportunity is relevant to THIS specific business
- Include realistic timeline and investment estimates where possible
- Required capabilities should help identify what professionals might be needed

OPPORTUNITY CATEGORIES:
- digital_transformation: E-commerce, digital marketing, online presence
- market_expansion: New markets, customer segments, geography
- operational_efficiency: Process improvement, automation, cost reduction
- technology_adoption: New tools, software, infrastructure
- customer_experience: CX improvement, feedback systems, personalization
- revenue_diversification: New revenue streams, pricing models
- brand_and_marketing: Branding, content, social media, SEO
- human_capital: Hiring, training, team development

Be realistic. A small retail store doesn't need enterprise AI. Focus on actionable, appropriate opportunities.`;

// ─── Agent Function ──────────────────────────────────────

export async function runOpportunityDiscovery(
  input: OpportunityDiscoveryInput
): Promise<OpportunityDiscoveryOutput> {
  const validatedInput = OpportunityDiscoveryInput.parse(input);

  const userPrompt = `Identify growth opportunities for the following business:

Company: ${validatedInput.business.companyName}
Industry: ${validatedInput.business.industry}
Size: ${validatedInput.business.size}
Location: ${validatedInput.business.location}

Goals:
${validatedInput.business.goals.map((g) => `- ${g}`).join("\n")}

Challenges:
${validatedInput.business.challenges.map((c) => `- ${c}`).join("\n")}

Business Analysis:
Health Scores: ${JSON.stringify(validatedInput.analysis.healthScores)}

SWOT:
- Strengths: ${validatedInput.analysis.swot.strengths.join(", ")}
- Weaknesses: ${validatedInput.analysis.swot.weaknesses.join(", ")}
- Opportunities: ${validatedInput.analysis.swot.opportunities.join(", ")}
- Threats: ${validatedInput.analysis.swot.threats.join(", ")}

Key Findings:
${validatedInput.analysis.keyFindings.map((f) => `- ${f.title}: ${f.description}`).join("\n")}

Identify 4-8 prioritized opportunities with detailed reasoning.`;

  return callStructured(userPrompt, OpportunityDiscoveryOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.4,
  });
}
