import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getBusinessProfile } from "@/lib/modules/business/service";
import {
  submitAssessment,
  getAssessmentByBusinessId,
  calculateCategoryScores,
  calculateOverallScore,
} from "@/lib/modules/assessment/service";
import { ZodError } from "zod";

/**
 * POST /api/assessment/submit
 * Submits a completed assessment for the authenticated user's business.
 * Requires BUSINESS role and an existing business profile.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);

    // Get the user's business profile
    const profile = await getBusinessProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Business profile required before taking the assessment" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Submit the assessment
    const assessment = await submitAssessment(profile.id, body);

    // Compute scores server-side and return them
    const categoryScores = calculateCategoryScores(assessment.responses);
    const overallScore = calculateOverallScore(assessment.responses);

    return NextResponse.json({ assessment, categoryScores, overallScore }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.message.startsWith("Unknown question") ||
        error.message.startsWith("Invalid answer"))
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("POST /api/assessment/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assessment/submit
 * Returns the latest assessment for the authenticated user's business.
 */
export async function GET() {
  try {
    const user = await requireAuth(["BUSINESS"]);

    const profile = await getBusinessProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Business profile not found" },
        { status: 404 }
      );
    }

    const assessment = await getAssessmentByBusinessId(profile.id);

    if (!assessment) {
      return NextResponse.json(
        { assessment: null },
        { status: 200 }
      );
    }

    // Compute scores server-side
    const categoryScores = calculateCategoryScores(assessment.responses);
    const overallScore = calculateOverallScore(assessment.responses);

    return NextResponse.json({ assessment, categoryScores, overallScore });
  } catch (error) {
    console.error("GET /api/assessment/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
