import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";
import { prisma } from "@/lib/db/client";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  role: Role;
}

/**
 * Require authentication for a server-side route.
 * Redirects to /login if no session exists.
 * Optionally checks that the user has one of the allowed roles.
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<AuthUser> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: session.user.id },
  });

  if (!user) {
    // User exists in Supabase Auth but not in our DB — profile incomplete
    redirect("/login?error=profile_missing");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/login?error=unauthorized");
  }

  return {
    id: user.id,
    supabaseId: user.supabaseId,
    email: user.email,
    role: user.role,
  };
}

/**
 * Get the current session without redirecting.
 * Returns null if not authenticated.
 */
export async function getOptionalAuth(): Promise<AuthUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: session.user.id },
  });

  if (!user) return null;

  return {
    id: user.id,
    supabaseId: user.supabaseId,
    email: user.email,
    role: user.role,
  };
}
