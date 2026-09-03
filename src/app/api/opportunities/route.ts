import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getBusinessProfile } from "@/lib/modules/business/service";
import {
  discoverOpportunitiesForBusiness,
  getOpportunitiesByBusinessId,
} from "@/lib/modules/opportunity/service";
import { ZodError } from "zod";
import {
  AIProviderError,
  AIValidationError,
  AIRateLimitError,
} from "@/lib/modules/ai/types";

/**
 * POST /api/opportunities
 * Triggers AI opportunity discovery for the authenticated business.
 * Requires BUSINESS role, existing profile, and a completed BusinessAnalysis.
 */
export async function POST() {
  try {
    const user = await requireAuth(["BUSINESS"]);

    // Resolve the business profile from the authenticated user
    const profile = await getBusinessProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Complete your business profile first" },
        { status: 400 }
      );
    }

    // Run the discovery pipeline — never accept businessId/analysisId from client
    const opportunities = await discoverOpportunitiesForBusiness(profile.id);

    return NextResponse.json({ opportunities }, { status: 201 });
  } catch (error) {
    // Missing prerequisites
    if (
      error instanceof Error &&
      (error.message === "No business analysis found. Run analysis first." ||
        error.message === "Business profile not found" ||
        error.message === "Business analysis is missing SWOT data. Re-run analysis." ||
        error.message === "AI did not identify any opportunities." ||
        error.message === "AI output contains an opportunity missing required fields.")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // AI validation failure
    if (error instanceof AIValidationError) {
      console.error("POST /api/opportunities — AI validation error:", error.message);
      return NextResponse.json(
        { error: "AI produced invalid output. Please try again." },
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
      console.error("POST /api/opportunities — AI provider error:", error.message);
      return NextResponse.json(
        { error: "AI opportunity discovery failed. Please try again." },
        { status: 502 }
      );
    }

    // Zod validation failure
    if (error instanceof ZodError) {
      console.error("POST /api/opportunities — Zod error:", error.flatten());
      return NextResponse.json(
        { error: "Opportunity output validation failed." },
        { status: 500 }
      );
    }

    console.error("POST /api/opportunities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/opportunities
 * Returns all opportunities for the authenticated business.
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

    const opportunities = await getOpportunitiesByBusinessId(profile.id);

    return NextResponse.json({ opportunities }, { status: 200 });
  } catch (error) {
    console.error("GET /api/opportunities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
