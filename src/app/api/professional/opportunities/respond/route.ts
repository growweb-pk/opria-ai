import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import { respondOpportunitySchema } from "@/lib/modules/professional/schemas";
import { respondToOpportunity } from "@/lib/modules/professional/service";

/**
 * POST /api/professional/opportunities/respond
 *
 * Accept or decline a matched opportunity for the AUTHENTICATED professional.
 * Ownership is resolved server-side from the session — the client only supplies
 * the MatchResult id and the desired decision. Idempotent for repeated identical
 * decisions; conflicting flips after a terminal decision are rejected.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(["PROFESSIONAL"]);
    const body = respondOpportunitySchema.parse(await request.json());

    const match = await respondToOpportunity(user.id, body);

    return NextResponse.json(
      {
        matchResultId: match.id,
        responseStatus: match.responseStatus,
        respondedAt: match.respondedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Opportunity not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof Error &&
      error.message === "Opportunity already responded"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("POST /api/professional/opportunities/respond error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
