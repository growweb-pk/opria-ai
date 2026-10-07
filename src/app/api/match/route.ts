import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import { runMatchSchema } from "@/lib/modules/matching/schemas";
import {
  getRecommendationsForBusinessUser,
  runMatchingForRequirement,
} from "@/lib/modules/matching/service";
import {
  AIProviderError,
  AIValidationError,
  AIRateLimitError,
} from "@/lib/modules/ai/types";

export const maxDuration = 60;

/**
 * POST /api/match
 * Triggers the hybrid matching pipeline for an APPROVED requirement owned by
 * the authenticated BUSINESS user. Idempotent — a completed match is reused.
 * businessId is resolved server-side; the client only supplies requirementId.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const body = runMatchSchema.parse(await request.json());

    const matchRequest = await runMatchingForRequirement(
      user.id,
      body.requirementId
    );

    return NextResponse.json({ matchRequest }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Requirement not found" ||
        error.message === "Business profile not found")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof Error &&
      error.message === "Requirement must be approved before matching"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please try again shortly." },
        { status: 429 }
      );
    }

    if (error instanceof AIValidationError || error instanceof AIProviderError) {
      console.error("POST /api/match — AI error:", error.message);
      return NextResponse.json(
        { error: "AI matching failed. Structured results may still be available." },
        { status: 502 }
      );
    }

    console.error("POST /api/match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/match
 * Returns persisted recommendations for the authenticated business.
 * Reads existing MatchRequest/MatchResult rows — performs NO AI calls.
 */
export async function GET() {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const recommendations = await getRecommendationsForBusinessUser(user.id);
    return NextResponse.json({ recommendations }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Business profile not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("GET /api/match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
