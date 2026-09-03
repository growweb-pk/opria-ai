/**
 * Requirement Structuring Agent
 *
 * Role: Converts assessment responses and advisor conversation into a structured
 * project requirement document.
 *
 * Responsibilities:
 * - Extract goals, requirements, constraints, budget, timeline
 * - Identify professional categories needed
 * - Mark uncertain or missing information clearly
 * - Produce a complete, structured requirement for matching
 *
 * Constraints:
 * - Only use information from assessment responses and conversation
 * - Never invent budget figures or requirements not discussed
 * - Clearly mark uncertain or missing information
 */

import { z } from "zod";
import { callStructured } from "../provider";
import { ProvenanceEnum } from "../provenance";

// ─── Input Schema ────────────────────────────────────────

export const RequirementStructuringInput = z.object({
  business: z.object({
    companyName: z.string(),
    industry: z.string(),
    size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]),
    goals: z.array(z.string()),
    challenges: z.array(z.string()),
  }),
  assessmentResponses: z.array(
    z.object({
      category: z.string(),
      question: z.string(),
      answer: z.string(),
      score: z.number(),
    })
  ),
  conversationSummary: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

export type RequirementStructuringInput = z.infer<typeof RequirementStructuringInput>;

// ─── Output Schema ───────────────────────────────────────

const SourceWithDefault = ProvenanceEnum.default("INFERRED");

const normalizePriority = (val: unknown): unknown => {
  if (typeof val !== "string") return val ?? "should-have";
  const normalized = val.toLowerCase().replace(/_/g, "-");
  if (["must-have", "required", "critical", "high"].includes(normalized)) return "must-have";
  if (["nice-to-have", "optional", "low"].includes(normalized)) return "nice-to-have";
  return "should-have";
};

const normalizeConstraints = (val: unknown): unknown => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") {
    return Object.entries(val as Record<string, unknown>).map(([key, value]) => ({
      type: ["budget", "timeline", "technical", "resource"].includes(key) ? key : "other",
      description: typeof value === "string" ? value : JSON.stringify(value),
      source: "INFERRED",
    }));
  }
  if (typeof val === "string" && val.trim()) {
    return [{ type: "other", description: val, source: "INFERRED" }];
  }
  return [];
};

const normalizeProfessionalCategories = (val: unknown): unknown => {
  if (!Array.isArray(val)) return [];
  return val.map((item) =>
    typeof item === "string"
      ? { name: item, description: item, requiredSkills: [], priority: "primary" }
      : item
  );
};

const normalizeMissingInformation = (val: unknown): unknown => {
  if (!Array.isArray(val)) return [];
  return val.map((item) =>
    typeof item === "string"
      ? { field: item, importance: "important" }
      : item
  );
};

export const RequirementStructuringOutput = z.object({
  title: z.string().default("Structured Business Requirement"),
  summary: z.string().default("Requirement summary was not provided by the AI output."),
  goals: z.array(
    z.object({
      description: z.string(),
      source: SourceWithDefault,
    })
  ).default([]),
  requirements: z.array(
    z.object({
      category: z.string().default("General"),
      description: z.string(),
      priority: z.preprocess(
        normalizePriority,
        z.enum(["must-have", "should-have", "nice-to-have"])
      ),
      source: SourceWithDefault,
    })
  ).default([]),
  constraints: z.preprocess(
    normalizeConstraints,
    z.array(
      z.object({
        type: z.enum(["budget", "timeline", "technical", "resource", "other"]),
        description: z.string(),
        source: SourceWithDefault,
      })
    )
  ),
  budget: z.object({
    estimated: z.string().optional(),
    range: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0.5),
    source: SourceWithDefault,
  }).default({ confidence: 0.5, source: "INFERRED" }),
  timeline: z.object({
    estimated: z.string().optional(),
    deadline: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0.5),
    source: SourceWithDefault,
  }).default({ confidence: 0.5, source: "INFERRED" }),
  professionalCategories: z.preprocess(
    normalizeProfessionalCategories,
    z.array(
      z.object({
        name: z.string(),
        description: z.string().default(""),
        requiredSkills: z.array(z.string()).default([]),
        priority: z.enum(["primary", "secondary", "optional"]).default("primary"),
      })
    )
  ),
  missingInformation: z.preprocess(
    normalizeMissingInformation,
    z.array(
      z.object({
        field: z.string(),
        importance: z.enum(["critical", "important", "nice-to-have"]).default("important"),
      })
    )
  ),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type RequirementStructuringOutput = z.infer<typeof RequirementStructuringOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria Requirement Structuring Agent. Your job is to convert raw business information, assessment responses, and advisor conversations into a structured project requirement document.

CRITICAL RULES:
- Extract goals, requirements, constraints, budget, and timeline ONLY from provided data
- NEVER invent budget figures, timelines, or requirements not present in the data
- Mark every item with its source: PROVIDED (explicitly stated) or INFERRED (reasonably deduced)
- If information is missing, add it to missingInformation — do NOT guess
- Professional categories should reflect what skills/expertise the business needs
- Requirements should be specific enough for professional matching

STRUCTURE GUIDELINES:
- Goals: What the business wants to achieve (outcomes)
- Requirements: What specifically needs to be done (deliverables/tasks)
- Constraints: Budget, timeline, technical, resource limitations
- Professional categories: Types of professionals who could help (e.g., "Web Developer", "Digital Marketer", "E-commerce Specialist")

Be thorough but honest. Missing information is fine — mark it clearly.`;

// ─── Agent Function ──────────────────────────────────────

export async function runRequirementStructuring(
  input: RequirementStructuringInput
): Promise<RequirementStructuringOutput> {
  const validatedInput = RequirementStructuringInput.parse(input);

  const assessmentSection =
    validatedInput.assessmentResponses.length > 0
      ? `Assessment Responses:\n${validatedInput.assessmentResponses
          .map((r) => `- [${r.category}] ${r.question}: "${r.answer}" (score: ${r.score})`)
          .join("\n")}`
      : "No assessment responses provided.";

  const conversationSection =
    validatedInput.conversationHistory.length > 0
      ? `\n\nAdvisor Conversation:\n${validatedInput.conversationHistory
          .map((m) => `${m.role === "user" ? "Business Owner" : "Advisor"}: ${m.content}`)
          .join("\n")}`
      : "";

  const summarySection = validatedInput.conversationSummary
    ? `\n\nConversation Summary: ${validatedInput.conversationSummary}`
    : "";

  const userPrompt = `Create a structured requirement document from the following:

Business: ${validatedInput.business.companyName} (${validatedInput.business.industry}, ${validatedInput.business.size})
Goals: ${validatedInput.business.goals.join(", ") || "Not specified"}
Challenges: ${validatedInput.business.challenges.join(", ") || "Not specified"}

${assessmentSection}${conversationSection}${summarySection}

Produce a comprehensive structured requirement document.`;

  return callStructured(userPrompt, RequirementStructuringOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
  });
}
