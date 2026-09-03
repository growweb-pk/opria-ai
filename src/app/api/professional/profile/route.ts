import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  getProfessionalProfile,
  createProfessionalProfile,
  updateProfessionalProfile,
} from "@/lib/modules/professional/service";
import { ZodError } from "zod";

/**
 * GET /api/professional/profile
 * Returns the authenticated user's professional profile.
 */
export async function GET() {
  try {
    const user = await requireAuth(["PROFESSIONAL"]);

    const profile = await getProfessionalProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/professional/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/professional/profile
 * Creates a new professional profile for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(["PROFESSIONAL"]);

    const existing = await getProfessionalProfile(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "Professional profile already exists. Use PUT to update." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const profile = await createProfessionalProfile(user.id, body);

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("POST /api/professional/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/professional/profile
 * Updates the authenticated user's professional profile.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth(["PROFESSIONAL"]);

    const body = await request.json();
    const profile = await updateProfessionalProfile(user.id, body);

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
      error.message === "Professional profile not found"
    ) {
      return NextResponse.json(
        { error: "Professional profile not found. Use POST to create." },
        { status: 404 }
      );
    }

    console.error("PUT /api/professional/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
