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
import type { BusinessAnalysis, Prisma } from "@prisma/client";
import { getAssessmentByBusinessId } from "@/lib/modules/assessment/service";
import {
  runBusinessAnalysis,
  type BusinessAnalysisInput,
  type BusinessAnalysisOutput,
} from "@/lib/modules/ai/agents/business-analysis";

/**
 * Get the latest analysis for a business.
 * Returns null if no analysis exists.
 */
export async function getLatestAnalysis(
  businessId: string
): Promise<BusinessAnalysis | null> {
  return prisma.businessAnalysis.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Run the full Business Analysis pipeline for a business.
 *
 * Pipeline:
 *   1. Resolve business profile
 *   2. Resolve latest completed assessment + responses
 *   3. Build the exact BusinessAnalysisInput expected by the agent
 *   4. Call the existing runBusinessAnalysis() agent (→ Gemini → Zod validation)
 *   5. Build provenance summary
 *   6. Persist the validated BusinessAnalysis record
 *
 * Returns the persisted analysis.
 * Throws descriptive errors for missing prerequisites or AI failures.
 */
export async function runAnalysisForBusiness(
  businessId: string
): Promise<BusinessAnalysis> {
  // 1. Resolve business profile
  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessId },
  });
  if (!profile) {
    throw new Error("Business profile not found");
  }

  // 2. Resolve latest completed assessment with responses
  const assessment = await getAssessmentByBusinessId(businessId);
  if (!assessment || assessment.status !== "COMPLETED") {
    throw new Error("No completed assessment found for this business");
  }

  // 3. Build the exact input expected by the existing AI agent
  const input: BusinessAnalysisInput = {
    business: {
      companyName: profile.companyName,
      industry: profile.industry,
      size: profile.size,
      location: profile.location,
      description: profile.description,
      goals: profile.goals,
      challenges: profile.challenges,
    },
    assessmentResponses: assessment.responses.map((r) => ({
      category: r.category,
      question: r.question,
      answer: r.answer,
      score: r.score,
    })),
  };

  // 4. Call the existing AI agent — goes through provider abstraction → Gemini
  //    The agent internally validates input + output with Zod schemas.
  //    If Gemini returns malformed output, this throws AIValidationError.
  const output: BusinessAnalysisOutput = await runBusinessAnalysis(input);

  // 5. Build provenance summary
  //    The AI agent tags each keyFinding with PROVIDED/INFERRED/RECOMMENDED.
  //    At the analysis level, we record the data source for each major section.
  const provenance = {
    healthScores: "INFERRED" as const,
    swot: "INFERRED" as const,
    overallAssessment: "INFERRED" as const,
    businessProfile: "PROVIDED" as const,
    assessmentData: "PROVIDED" as const,
  };

  // 6. Persist the validated analysis — never persist unvalidated AI output
  const analysis = await prisma.businessAnalysis.create({
    data: {
      businessId,
      assessmentId: assessment.id,
      analysisData: output as unknown as Prisma.InputJsonValue,
      healthScores: output.healthScores as unknown as Prisma.InputJsonValue,
      provenance: provenance as unknown as Prisma.InputJsonValue,
      confidence: output.confidence,
    },
  });

  return analysis;
}
