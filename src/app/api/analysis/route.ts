import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getBusinessProfile } from "@/lib/modules/business/service";
import {
  runAnalysisForBusiness,
  getLatestAnalysis,
} from "@/lib/modules/analysis/service";
import { ZodError } from "zod";
import {
  AIProviderError,
  AIValidationError,
  AIRateLimitError,
} from "@/lib/modules/ai/types";

// AI calls (gemini thinking model / OpenRouter free tiers) can exceed Vercel's
// default 10s Hobby timeout — allow up to 60s.
export const maxDuration = 60;

/**
 * POST /api/analysis
 * Triggers AI business analysis for the authenticated business.
 * Requires BUSINESS role and existing profile + completed assessment.
 */
export async function POST() {
  try {
    const user = await requireAuth(["BUSINESS"]);

    // Resolve the business profile from the authenticated user
    const profile = await getBusinessProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Complete your business profile before running analysis" },
        { status: 400 }
      );
    }

    // Run the analysis pipeline — never accept businessId from the client
    const analysis = await runAnalysisForBusiness(profile.id);

    return NextResponse.json(
      {
        analysis: {
          id: analysis.id,
          healthScores: analysis.healthScores,
          analysisData: analysis.analysisData,
          confidence: analysis.confidence,
          provenance: analysis.provenance,
          createdAt: analysis.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Missing prerequisites
    if (
      error instanceof Error &&
      (error.message === "Business profile not found" ||
        error.message === "No completed assessment found for this business")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // AI validation failure — malformed output
    if (error instanceof AIValidationError) {
      console.error("POST /api/analysis — AI validation error:", error.message);
      return NextResponse.json(
        { error: "AI analysis produced invalid output. Please try again." },
        { status: 502 }
      );
    }

    // AI rate limit
    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please try again shortly." },
        { status: 429 }
      );
    }

    // General AI provider error
    if (error instanceof AIProviderError) {
      console.error("POST /api/analysis — AI provider error:", error.message);
      return NextResponse.json(
        { error: "AI analysis failed. Please try again." },
        { status: 502 }
      );
    }

    // Zod validation failure (should not happen — agent validates internally)
    if (error instanceof ZodError) {
      console.error("POST /api/analysis — Zod error:", error.flatten());
      return NextResponse.json(
        { error: "Analysis output validation failed." },
        { status: 500 }
      );
    }

    console.error("POST /api/analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analysis
 * Returns the latest business analysis for the authenticated business.
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

    const analysis = await getLatestAnalysis(profile.id);

    if (!analysis) {
      return NextResponse.json({ analysis: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        analysis: {
          id: analysis.id,
          healthScores: analysis.healthScores,
          analysisData: analysis.analysisData,
          provenance: analysis.provenance,
          confidence: analysis.confidence,
          createdAt: analysis.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
