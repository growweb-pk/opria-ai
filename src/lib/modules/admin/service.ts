import { prisma } from "@/lib/db/client";
import { setUserStatusSchema } from "./schemas";

/**
 * Phase 6 — Admin service.
 *
 * ADMIN access is intentionally cross-tenant (read-only across all modules per
 * blueprint §10). Every caller MUST enforce `requireAuth(["ADMIN"])`; these
 * functions never accept a client-supplied tenant id and perform no AI calls.
 */

export interface AdminAnalytics {
  totalUsers: number;
  businessUsers: number;
  professionalUsers: number;
  adminUsers: number;
  assessmentsCompleted: number;
  analyses: number;
  matchRequests: number;
  matchResults: number;
  matchesCompleted: number;
}

/** Real database counts for the admin analytics dashboard. No hardcoded values. */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [
    totalUsers,
    businessUsers,
    professionalUsers,
    adminUsers,
    assessmentsCompleted,
    analyses,
    matchRequests,
    matchResults,
    matchesCompleted,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "BUSINESS" } }),
    prisma.user.count({ where: { role: "PROFESSIONAL" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.assessment.count({ where: { status: "COMPLETED" } }),
    prisma.businessAnalysis.count(),
    prisma.matchRequest.count(),
    prisma.matchResult.count(),
    prisma.matchRequest.count({ where: { status: "COMPLETED" } }),
  ]);

  return {
    totalUsers,
    businessUsers,
    professionalUsers,
    adminUsers,
    assessmentsCompleted,
    analyses,
    matchRequests,
    matchResults,
    matchesCompleted,
  };
}

/** User list for admin user management: real roles, statuses, and profile labels. */
export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      business: { select: { companyName: true } },
      professional: { select: { name: true, title: true } },
    },
  });
}

export type AdminUser = Awaited<ReturnType<typeof getAdminUsers>>[number];

/** Recent persisted AI analyses with confidence + provenance metadata. No new AI calls. */
export async function getRecentAnalyses(limit = 20) {
  return prisma.businessAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      confidence: true,
      createdAt: true,
      healthScores: true,
      provenance: true,
      business: { select: { companyName: true, industry: true } },
    },
  });
}

export type AdminAnalysis = Awaited<ReturnType<typeof getRecentAnalyses>>[number];

/** Recent match requests for processing-status monitoring. No new AI calls. */
export async function getRecentMatchRequests(limit = 20) {
  return prisma.matchRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      results: true,
      requirement: { select: { title: true } },
      business: { select: { companyName: true } },
    },
  });
}

export type AdminMatchRequest = Awaited<
  ReturnType<typeof getRecentMatchRequests>
>[number];

/**
 * Suspend or reactivate a user.
 * SECURITY: caller enforces ADMIN; self-protection prevents an admin from
 * suspending their own account (which would lock them out mid-session).
 */
export async function setUserStatus(
  currentAdminId: string,
  input: { userId: string; status: "ACTIVE" | "SUSPENDED" }
) {
  const validated = setUserStatusSchema.parse(input);

  if (validated.userId === currentAdminId) {
    throw new Error("You cannot change your own status");
  }

  const target = await prisma.user.findUnique({ where: { id: validated.userId } });
  if (!target) {
    throw new Error("User not found");
  }

  return prisma.user.update({
    where: { id: validated.userId },
    data: { status: validated.status },
  });
}
