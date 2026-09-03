import { prisma } from "@/lib/db/client";
import { getBusinessProfile } from "@/lib/modules/business/service";
import { getAssessmentByBusinessId } from "@/lib/modules/assessment/service";
import {
  runRequirementStructuring,
  type RequirementStructuringInput,
} from "@/lib/modules/ai/agents/requirement-structuring";
import { runMatchingForRequirement } from "@/lib/modules/matching/service";
import { Prisma, type Requirement } from "@prisma/client";

function toAiHistory(messages: { role: string; content: string }[]) {
  return messages
    .filter((m) => m.role === "USER" || m.role === "ADVISOR")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
}

async function resolveBusinessForUser(userId: string) {
  const business = await getBusinessProfile(userId);
  if (!business) {
    throw new Error("Business profile not found");
  }
  return business;
}

export async function listRequirementsForBusinessUser(
  userId: string
): Promise<Requirement[]> {
  const business = await resolveBusinessForUser(userId);
  return prisma.requirement.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRequirementForBusinessUser(
  userId: string,
  requirementId: string
): Promise<Requirement> {
  const business = await resolveBusinessForUser(userId);
  const requirement = await prisma.requirement.findFirst({
    where: { id: requirementId, businessId: business.id },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return requirement;
}

export async function generateRequirementForConversation(
  userId: string,
  conversationId: string
): Promise<Requirement> {
  const business = await resolveBusinessForUser(userId);
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId: business.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } }, requirement: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const assessment = await getAssessmentByBusinessId(business.id);
  const input: RequirementStructuringInput = {
    business: {
      companyName: business.companyName,
      industry: business.industry,
      size: business.size,
      goals: business.goals,
      challenges: business.challenges,
    },
    assessmentResponses:
      assessment?.responses.map((r) => ({
        category: r.category,
        question: r.question,
        answer: r.answer,
        score: r.score,
      })) ?? [],
    conversationSummary:
      typeof conversation.context === "object" && conversation.context && !Array.isArray(conversation.context)
        ? JSON.stringify(conversation.context)
        : undefined,
    conversationHistory: toAiHistory(conversation.messages),
  };

  const output = await runRequirementStructuring(input);

  const requirement = await prisma.requirement.upsert({
    where: { conversationId: conversation.id },
    update: {
      title: output.title,
      structuredData: output as unknown as Prisma.InputJsonValue,
      confidence: output.confidence,
      status: "DRAFT",
    },
    create: {
      conversationId: conversation.id,
      businessId: business.id,
      title: output.title,
      structuredData: output as unknown as Prisma.InputJsonValue,
      confidence: output.confidence,
      status: "DRAFT",
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: "COMPLETED" },
  });

  return requirement;
}

export async function approveRequirementForBusinessUser(
  userId: string,
  requirementId: string
): Promise<Requirement> {
  const business = await resolveBusinessForUser(userId);
  const existing = await prisma.requirement.findFirst({
    where: { id: requirementId, businessId: business.id },
  });

  if (!existing) {
    throw new Error("Requirement not found");
  }

  await prisma.requirement.update({
    where: { id: requirementId },
    data: { status: "APPROVED" },
  });

  // Blueprint §12.3: matching is triggered when a business approves a requirement.
  // runMatchingForRequirement is idempotent (reuses a completed MatchRequest and
  // never creates duplicates). A matching failure must NOT roll back the approval —
  // recommendations degrade to an empty state and can be retried via POST /api/match.
  try {
    await runMatchingForRequirement(userId, requirementId);
  } catch (error) {
    console.error("Matching trigger after approval failed:", error);
  }

  // Re-read to reflect the post-matching status (MATCHED) when matching succeeded.
  return prisma.requirement.findUniqueOrThrow({ where: { id: requirementId } });
}
