import { cache } from "react";
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

interface ResolvedAuth {
  hasSession: boolean;
  user: AuthUser | null;
}

/**
 * Resolve the current session and database user ONCE per server request.
 *
 * Wrapped in React's `cache()` so the Supabase session read and the
 * `user.findUnique` DB lookup are deduplicated across every caller within the
 * same request. The dashboard layout calls `requireAuth()` and each page calls
 * `requireAuth([...])` again — without this they each trigger their own
 * identical database round-trip. Caching removes one full DB round-trip from
 * every authenticated navigation with zero behavior change.
 */
const resolveAuth = cache(async (): Promise<ResolvedAuth> => {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { hasSession: false, user: null };

  const user = await prisma.user.findUnique({
    where: { supabaseId: session.user.id },
  });

  if (!user) return { hasSession: true, user: null };

  return {
    hasSession: true,
    user: {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      role: user.role,
    },
  };
});

/**
 * Require authentication for a server-side route.
 * Redirects to /login if no session exists.
 * Optionally checks that the user has one of the allowed roles.
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<AuthUser> {
  const { hasSession, user } = await resolveAuth();

  if (!hasSession) {
    redirect("/login");
  }

  if (!user) {
    // User exists in Supabase Auth but not in our DB — profile incomplete
    redirect("/login?error=profile_missing");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/login?error=unauthorized");
  }

  return user;
}

/**
 * Get the current session without redirecting.
 * Returns null if not authenticated.
 */
export async function getOptionalAuth(): Promise<AuthUser | null> {
  const { user } = await resolveAuth();
  return user;
}
