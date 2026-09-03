import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  approveRequirementForBusinessUser,
  getRequirementForBusinessUser,
} from "@/lib/modules/requirement/service";
import { updateRequirementSchema } from "@/lib/modules/requirement/schemas";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const requirement = await getRequirementForBusinessUser(user.id, params.id);
    return NextResponse.json({ requirement });
  } catch (error) {
    if (error instanceof Error && error.message === "Requirement not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("GET /api/requirements/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const body = updateRequirementSchema.parse(await request.json());

    if (body.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only requirement approval is supported in Phase 4" },
        { status: 400 }
      );
    }

    const requirement = await approveRequirementForBusinessUser(user.id, params.id);
    return NextResponse.json({ requirement });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Requirement not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("PATCH /api/requirements/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
