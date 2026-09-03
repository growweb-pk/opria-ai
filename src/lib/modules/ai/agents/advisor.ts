/**
 * AI Business Advisor Agent
 *
 * Role: Conducts requirement-discovery conversations with business owners.
 * Asks useful follow-up questions, uses existing business context,
 * and avoids repeatedly asking questions that are already answered.
 *
 * Responsibilities:
 * - Engage in natural, helpful conversation
 * - Ask targeted questions to uncover requirements
 * - Reference existing business context to avoid repetition
 * - Guide the business toward clear, actionable requirements
 *
 * Constraints:
 * - Do not make unsupported assumptions
 * - Do not ask questions already answered in the business profile
 * - Be conversational, not interrogative
 * - Do not provide financial/legal/medical advice
 */

import { z } from "zod";
import { callStructured } from "../provider";

// ─── Input Schema ────────────────────────────────────────

export const AdvisorInput = z.object({
  businessContext: z.object({
    companyName: z.string(),
    industry: z.string(),
    size: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]),
    goals: z.array(z.string()),
    challenges: z.array(z.string()),
    description: z.string().nullable(),
  }),
  opportunityContext: z
    .object({
      title: z.string(),
      category: z.string(),
      priority: z.string(),
      description: z.string().optional(),
      reasoning: z.string().optional(),
      requiredCapabilities: z.array(z.string()).default([]),
    })
    .optional(),
  analysisContext: z
    .object({
      overallScore: z.number().optional(),
      strengths: z.array(z.string()).default([]),
      weaknesses: z.array(z.string()).default([]),
      opportunities: z.array(z.string()).default([]),
      threats: z.array(z.string()).default([]),
    })
    .optional(),
  assessmentContext: z
    .array(
      z.object({
        category: z.string(),
        question: z.string(),
        answer: z.string(),
        score: z.number(),
      })
    )
    .default([]),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  userMessage: z.string(),
});

export type AdvisorInput = z.infer<typeof AdvisorInput>;

// ─── Output Schema ───────────────────────────────────────

export const AdvisorOutput = z.object({
  response: z.string(),
  suggestedQuestions: z.array(z.string()).default([]),
  requirementProgress: z.number().min(0).max(100).default(20),
  identifiedNeeds: z.array(z.string()).default([]),
  pendingClarifications: z.array(z.string()).default([]),
  readyForRequirement: z.boolean().default(false),
});

export type AdvisorOutput = z.infer<typeof AdvisorOutput>;

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are the Opria AI Business Advisor. You are having a conversation with a business owner to help them clarify their needs and requirements.

YOUR ROLE:
- Help the business owner think through what they need
- Ask thoughtful, targeted questions
- Build on what they've already told you
- Summarize and confirm understanding periodically
- Be warm, professional, and genuinely helpful

IMPORTANT RULES:
- Do NOT repeat questions that have already been answered
- Reference information from the business profile when relevant
- Do not make assumptions about budget, revenue, or capabilities without asking
- Do not provide specific financial, legal, or medical advice
- If the business seems stuck, offer examples or options to help them decide
- Keep responses concise — this is a conversation, not a lecture

CONVERSATION STYLE:
- Professional but friendly
- Use the business owner's language when possible
- Acknowledge what they've shared before asking follow-ups
- End with a clear next step or question

You are helping them discover what they need BEFORE connecting them with professionals.

Return a structured JSON object with:
- response: your conversational reply to the business owner
- suggestedQuestions: 2-3 optional answer prompts the UI can show
- requirementProgress: 0-100 estimate of how clear the requirement is
- identifiedNeeds: concrete needs confirmed so far
- pendingClarifications: important unknowns still needed
- readyForRequirement: true only when enough context exists to draft a requirement document

Do not claim a requirement is ready until budget/timeline/scope/critical integrations or constraints are reasonably clear.`;

// ─── Agent Function ──────────────────────────────────────

export async function runAdvisor(
  input: AdvisorInput
): Promise<AdvisorOutput> {
  const validatedInput = AdvisorInput.parse(input);
  const ctx = validatedInput.businessContext;
  const opp = validatedInput.opportunityContext;
  const analysis = validatedInput.analysisContext;

  const assessmentSection = validatedInput.assessmentContext.length
    ? `\nAssessment context:\n${validatedInput.assessmentContext
        .map((r) => `- [${r.category}] ${r.question}: ${r.answer} (score: ${r.score})`)
        .join("\n")}`
    : "\nNo assessment context available.";

  const opportunitySection = opp
    ? `\nSelected opportunity:\n- Title: ${opp.title}\n- Category: ${opp.category}\n- Priority: ${opp.priority}\n- Description: ${opp.description || "Not provided"}\n- Reasoning: ${opp.reasoning || "Not provided"}\n- Required capabilities: ${opp.requiredCapabilities.join(", ") || "Not specified"}`
    : "\nNo specific opportunity was selected.";

  const analysisSection = analysis
    ? `\nBusiness analysis context:\n- Overall score: ${analysis.overallScore ?? "Not available"}\n- Strengths: ${analysis.strengths.join(", ") || "Not available"}\n- Weaknesses: ${analysis.weaknesses.join(", ") || "Not available"}\n- Opportunities: ${analysis.opportunities.join(", ") || "Not available"}\n- Threats: ${analysis.threats.join(", ") || "Not available"}`
    : "\nNo analysis context available.";

  const historySection = validatedInput.conversationHistory.length
    ? validatedInput.conversationHistory
        .map((m) => `${m.role === "user" ? "Business Owner" : "Advisor"}: ${m.content}`)
        .join("\n")
    : "No previous advisor messages.";

  const userPrompt = `${SYSTEM_PROMPT}

Current business context:
- Company: ${ctx.companyName}
- Industry: ${ctx.industry}
- Size: ${ctx.size}
- Description: ${ctx.description || "Not provided"}
- Goals: ${ctx.goals.join(", ") || "Not specified"}
- Challenges: ${ctx.challenges.join(", ") || "Not specified"}
${opportunitySection}
${analysisSection}
${assessmentSection}

Conversation so far:
${historySection}

Latest business owner message:
${validatedInput.userMessage}

Respond as the advisor. Ask the next best follow-up question unless the requirement is genuinely ready to draft.`;

  return callStructured(userPrompt, AdvisorOutput, {
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.5,
  });
}
