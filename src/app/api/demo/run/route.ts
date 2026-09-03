import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getDemoJourney } from "@/lib/modules/demo/service";

/**
 * POST /api/demo/run
 *
 * "Run Demo" — returns the fast-forward journey for the AUTHENTICATED business,
 * listing each stage and whether its pre-computed data is ready. This performs
 * ZERO AI calls and does NOT mutate data: the demo scenario is fully pre-seeded,
 * so running the demo simply resolves where the presenter can jump to next.
 * Ownership is resolved from the session — no client-supplied business id.
 */
export async function POST() {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const journey = await getDemoJourney(user.id);

    if (!journey) {
      return NextResponse.json(
        { error: "No business profile found for this account" },
        { status: 404 }
      );
    }

    return NextResponse.json({ journey }, { status: 200 });
  } catch (error) {
    console.error("POST /api/demo/run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
