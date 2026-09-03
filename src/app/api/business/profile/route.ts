import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  getBusinessProfile,
  createBusinessProfile,
  updateBusinessProfile,
} from "@/lib/modules/business/service";
import { ZodError } from "zod";

/**
 * GET /api/business/profile
 * Returns the authenticated user's business profile.
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

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/business/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/profile
 * Creates a new business profile for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);

    // Check if profile already exists
    const existing = await getBusinessProfile(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "Business profile already exists. Use PUT to update." },
        { status: 409 }
      );
    }

    const body = await request.json();

    const profile = await createBusinessProfile(user.id, body);

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("POST /api/business/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/business/profile
 * Updates the authenticated user's business profile.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);

    const body = await request.json();

    const profile = await updateBusinessProfile(user.id, body);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "Business profile not found"
    ) {
      return NextResponse.json(
        { error: "Business profile not found. Use POST to create." },
        { status: 404 }
      );
    }

    console.error("PUT /api/business/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
