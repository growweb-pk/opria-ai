import { NextResponse } from "next/server";
import { getOptionalAuth } from "@/lib/modules/auth/service";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's role for client-side routing.
 */
export async function GET() {
  try {
    const user = await getOptionalAuth();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
