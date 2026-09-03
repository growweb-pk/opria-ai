import { prisma } from "@/lib/db/client";
import type { Assessment, AssessmentResponse } from "@prisma/client";
import {
  submitAssessmentSchema,
  type SubmitAssessmentInput,
} from "./schemas";
import { questions, getQuestionById } from "./questions";

/**
 * Get the latest assessment for a business.
 * Returns null if no assessment exists.
 */
export async function getAssessmentByBusinessId(
  businessId: string
): Promise<(Assessment & { responses: AssessmentResponse[] }) | null> {
  return prisma.assessment.findFirst({
    where: { businessId },
    include: { responses: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Check if the business has a completed assessment.
 */
export async function hasCompletedAssessment(
  businessId: string
): Promise<boolean> {
  const assessment = await prisma.assessment.findFirst({
    where: { businessId, status: "COMPLETED" },
  });
  return assessment !== null;
}

/**
 * Submit a new assessment for a business.
 * Validates all answers against the question bank.
 * Creates the assessment with all responses in a transaction.
 */
export async function submitAssessment(
  businessId: string,
  data: SubmitAssessmentInput
): Promise<Assessment & { responses: AssessmentResponse[] }> {
  // Validate input
  const validated = submitAssessmentSchema.parse(data);

  // Validate each answer exists in the question bank and derive canonical score
  const scoredResponses = validated.responses.map((response) => {
    const question = getQuestionById(response.questionId);
    if (!question) {
      throw new Error(`Unknown question: ${response.questionId}`);
    }

    // Verify the answer matches a known option and derive the canonical score
    const option = question.options.find((o) => o.label === response.answer);
    if (!option) {
      throw new Error(
        `Invalid answer for question ${response.questionId}: ${response.answer}`
      );
    }

    return {
      questionId: response.questionId,
      category: response.category,
      question: response.question,
      answer: response.answer,
      score: option.score, // server-derived canonical score
    };
  });

  // Create the assessment with all responses in a transaction
  const assessment = await prisma.assessment.create({
    data: {
      businessId,
      status: "COMPLETED",
      completedAt: new Date(),
      responses: {
        create: scoredResponses,
      },
    },
    include: { responses: true },
  });

  return assessment;
}

/**
 * Calculate category scores from an assessment's responses.
 * Returns a map of category -> { score, maxScore, percentage }.
 */
export function calculateCategoryScores(
  responses: AssessmentResponse[]
): Record<string, { score: number; maxScore: number; percentage: number }> {
  const categoryMap: Record<
    string,
    { score: number; maxScore: number }
  > = {};

  for (const response of responses) {
    if (!categoryMap[response.category]) {
      categoryMap[response.category] = { score: 0, maxScore: 0 };
    }
    categoryMap[response.category].score += response.score;

    // Derive the actual maximum score from the question bank.
    // Fallback: if the question is not in the bank (e.g. seed/demo data),
    // use 5 as the default max score per question.
    const question = getQuestionById(response.questionId);
    if (question) {
      const maxOptionScore = Math.max(...question.options.map((o) => o.score));
      categoryMap[response.category].maxScore += maxOptionScore;
    } else {
      categoryMap[response.category].maxScore += 5;
    }
  }

  const result: Record<
    string,
    { score: number; maxScore: number; percentage: number }
  > = {};

  for (const [category, data] of Object.entries(categoryMap)) {
    result[category] = {
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0,
    };
  }

  return result;
}

/**
 * Calculate overall health score (0-100) from category scores.
 */
export function calculateOverallScore(
  responses: AssessmentResponse[]
): number {
  const categoryScores = calculateCategoryScores(responses);
  const values = Object.values(categoryScores);
  if (values.length === 0) return 0;

  const totalPercentage = values.reduce((sum, v) => sum + v.percentage, 0);
  return Math.round(totalPercentage / values.length);
}

/**
 * Get the question bank for the assessment.
 */
export function getAssessmentQuestions() {
  return questions;
}
