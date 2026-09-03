import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import { setUserStatusSchema } from "@/lib/modules/admin/schemas";
import { setUserStatus } from "@/lib/modules/admin/service";

/**
 * PATCH /api/admin/users
 *
 * Suspend or reactivate a user. Restricted to authenticated ADMIN users.
 * Prevents an admin from changing their own status. No AI calls.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(["ADMIN"]);
    const body = setUserStatusSchema.parse(await request.json());

    const updated = await setUserStatus(user.id, body);

    return NextResponse.json(
      { id: updated.id, status: updated.status },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof Error &&
      error.message === "You cannot change your own status"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
