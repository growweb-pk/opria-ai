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
import { getBusinessProfile } from "@/lib/modules/business/service";
import { getAssessmentByBusinessId } from "@/lib/modules/assessment/service";
import { getLatestAnalysis } from "@/lib/modules/analysis/service";
import {
  runAdvisor,
  type AdvisorInput,
  type AdvisorOutput,
} from "@/lib/modules/ai/agents/advisor";
import { Prisma, type Conversation, type Message, type Opportunity } from "@prisma/client";

export type AdvisorConversationWithMessages = Conversation & {
  messages: Message[];
  requirement: {
    id: string;
    title: string;
    status: string;
    confidence: number;
    structuredData: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

interface AdvisorContext {
  selectedOpportunityId?: string;
  selectedOpportunity?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
  requirementProgress?: number;
  identifiedNeeds?: string[];
  pendingClarifications?: string[];
  suggestedQuestions?: string[];
  readyForRequirement?: boolean;
}

function asContext(value: Prisma.JsonValue | null): AdvisorContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AdvisorContext;
}

function toAiHistory(messages: Message[]) {
  return messages
    .filter((m) => m.role === "USER" || m.role === "ADVISOR")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
}

function normalizeSwot(analysisData: Record<string, unknown>) {
  const nested = analysisData.swot as
    | { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[] }
    | undefined;

  return {
    strengths: nested?.strengths ?? (analysisData.strengths as string[] | undefined) ?? [],
    weaknesses: nested?.weaknesses ?? (analysisData.weaknesses as string[] | undefined) ?? [],
    opportunities: nested?.opportunities ?? (analysisData.opportunities as string[] | undefined) ?? [],
    threats: nested?.threats ?? (analysisData.threats as string[] | undefined) ?? [],
  };
}

async function resolveBusinessForUser(userId: string) {
  const business = await getBusinessProfile(userId);
  if (!business) {
    throw new Error("Business profile not found");
  }
  return business;
}

async function getOwnedOpportunity(
  businessId: string,
  opportunityId: string
): Promise<Opportunity> {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, businessId },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  return opportunity;
}

async function buildAdvisorInput(
  businessId: string,
  opportunity: Opportunity | null,
  messages: Message[],
  userMessage: string
): Promise<AdvisorInput> {
  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) throw new Error("Business profile not found");

  const latestAnalysis = await getLatestAnalysis(businessId);
  const assessment = await getAssessmentByBusinessId(businessId);
  const analysisData = (latestAnalysis?.analysisData ?? {}) as Record<string, unknown>;
  const healthScores = (latestAnalysis?.healthScores ?? {}) as Record<string, number>;
  const swot = normalizeSwot(analysisData);
  const details = (opportunity?.details ?? {}) as Record<string, unknown>;

  return {
    businessContext: {
      companyName: business.companyName,
      industry: business.industry,
      size: business.size,
      description: business.description,
      goals: business.goals,
      challenges: business.challenges,
    },
    opportunityContext: opportunity
      ? {
          title: opportunity.title,
          category: opportunity.category,
          priority: opportunity.priority,
          description: typeof details.description === "string" ? details.description : undefined,
          reasoning: typeof details.reasoning === "string" ? details.reasoning : undefined,
          requiredCapabilities: Array.isArray(details.requiredCapabilities)
            ? details.requiredCapabilities.map(String)
            : [],
        }
      : undefined,
    analysisContext: latestAnalysis
      ? {
          overallScore: healthScores.overall,
          strengths: swot.strengths,
          weaknesses: swot.weaknesses,
          opportunities: swot.opportunities,
          threats: swot.threats,
        }
      : undefined,
    assessmentContext:
      assessment?.responses.map((r) => ({
        category: r.category,
        question: r.question,
        answer: r.answer,
        score: r.score,
      })) ?? [],
    conversationHistory: toAiHistory(messages),
    userMessage,
  };
}

function buildContext(
  existing: AdvisorContext,
  opportunity: Opportunity | null,
  output: AdvisorOutput
): Prisma.InputJsonValue {
  return {
    ...existing,
    selectedOpportunityId: opportunity?.id ?? existing.selectedOpportunityId,
    selectedOpportunity: opportunity
      ? {
          id: opportunity.id,
          title: opportunity.title,
          category: opportunity.category,
          priority: opportunity.priority,
        }
      : existing.selectedOpportunity,
    requirementProgress: output.requirementProgress,
    identifiedNeeds: output.identifiedNeeds,
    pendingClarifications: output.pendingClarifications,
    suggestedQuestions: output.suggestedQuestions,
    readyForRequirement: output.readyForRequirement,
  };
}

export async function createAdvisorConversation(
  userId: string,
  opportunityId: string
): Promise<AdvisorConversationWithMessages> {
  const business = await resolveBusinessForUser(userId);
  const opportunity = await getOwnedOpportunity(business.id, opportunityId);

  const initialContext: AdvisorContext = {
    selectedOpportunityId: opportunity.id,
    selectedOpportunity: {
      id: opportunity.id,
      title: opportunity.title,
      category: opportunity.category,
      priority: opportunity.priority,
    },
    requirementProgress: 10,
    identifiedNeeds: [opportunity.title],
    pendingClarifications: ["Scope", "Budget", "Timeline", "Constraints"],
  };

  const conversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      userId,
      status: "ACTIVE",
      context: initialContext as Prisma.InputJsonValue,
    },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });

  const input = await buildAdvisorInput(
    business.id,
    opportunity,
    [],
    `I want to pursue this opportunity: ${opportunity.title}. Please help me clarify the requirement.`
  );
  const output = await runAdvisor(input);

  const advisorMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ADVISOR",
      content: output.response,
      metadata: {
        suggestedQuestions: output.suggestedQuestions,
        requirementProgress: output.requirementProgress,
        identifiedNeeds: output.identifiedNeeds,
        pendingClarifications: output.pendingClarifications,
        readyForRequirement: output.readyForRequirement,
      } satisfies Record<string, unknown> as Prisma.InputJsonValue,
    },
  });

  const updatedContext = buildContext(initialContext, opportunity, output);
  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { context: updatedContext },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });

  return {
    ...updated,
    messages: [...updated.messages.filter((m) => m.id !== advisorMessage.id), advisorMessage].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    ),
  };
}

export async function listAdvisorConversations(
  userId: string
): Promise<AdvisorConversationWithMessages[]> {
  const business = await resolveBusinessForUser(userId);
  return prisma.conversation.findMany({
    where: { businessId: business.id, userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });
}

export async function getAdvisorConversation(
  userId: string,
  conversationId: string
): Promise<AdvisorConversationWithMessages> {
  const business = await resolveBusinessForUser(userId);
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId: business.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

export async function sendAdvisorMessage(
  userId: string,
  conversationId: string,
  content: string
): Promise<{
  conversation: AdvisorConversationWithMessages;
  userMessage: Message;
  advisorMessage: Message;
}> {
  const business = await resolveBusinessForUser(userId);
  const conversation = await getAdvisorConversation(userId, conversationId);
  const context = asContext(conversation.context);
  const opportunity = context.selectedOpportunityId
    ? await getOwnedOpportunity(business.id, context.selectedOpportunityId)
    : null;

  const previousMessages = conversation.messages;
  const userMessage = await prisma.message.create({
    data: { conversationId, role: "USER", content },
  });

  const input = await buildAdvisorInput(
    business.id,
    opportunity,
    previousMessages,
    content
  );
  const output = await runAdvisor(input);

  const advisorMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "ADVISOR",
      content: output.response,
      metadata: {
        suggestedQuestions: output.suggestedQuestions,
        requirementProgress: output.requirementProgress,
        identifiedNeeds: output.identifiedNeeds,
        pendingClarifications: output.pendingClarifications,
        readyForRequirement: output.readyForRequirement,
      } satisfies Record<string, unknown> as Prisma.InputJsonValue,
    },
  });

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { context: buildContext(context, opportunity, output) },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });

  return { conversation: updated, userMessage, advisorMessage };
}

export async function getAssessmentResponsesForBusiness(businessId: string) {
  const assessment = await getAssessmentByBusinessId(businessId);
  return assessment?.responses ?? [];
}

export async function getBusinessIdForUser(userId: string): Promise<string> {
  const business = await resolveBusinessForUser(userId);
  return business.id;
}
