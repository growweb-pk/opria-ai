import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/modules/auth/supabase-server";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    // Verify the caller is authenticated via Supabase session
    const supabase = createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Use the authenticated user's actual ID and email
    const supabaseId = authUser.id;
    const email = authUser.email ?? "";

    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: Role[] = ["BUSINESS", "PROFESSIONAL"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Idempotent: if user already exists, return success (handles network retries)
    const existing = await prisma.user.findUnique({
      where: { supabaseId },
    });

    if (existing) {
      return NextResponse.json(
        { userId: existing.id, role: existing.role, alreadyExisted: true }
      );
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        supabaseId,
        email,
        role,
      },
    });

    return NextResponse.json({ userId: user.id, role: user.role });
  } catch (error) {
    console.error("Profile creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
