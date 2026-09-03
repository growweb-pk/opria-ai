import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getDemoStatus } from "@/lib/modules/demo/service";

/**
 * GET /api/demo/status
 *
 * Reports whether the pre-seeded demo scenario is present and ready, plus real
 * platform counts. Read-only — ZERO AI calls, no mutation. Any authenticated
 * user may query demo readiness.
 */
export async function GET() {
  try {
    await requireAuth();
    const status = await getDemoStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error("GET /api/demo/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
