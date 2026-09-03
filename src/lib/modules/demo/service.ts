/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

import { prisma } from "@/lib/db/client";

/**
 * Phase 7 — Demo module.
 *
 * The demo journey is powered entirely by PRE-SEEDED, pre-computed data
 * (Bella's Boutique). This module performs ZERO AI calls — it only reads
 * persisted records to report which stages of the journey are complete so the
 * UI can offer one-click "fast-forward" navigation between stages.
 */

export interface JourneyStage {
  key: string;
  label: string;
  href: string;
  complete: boolean;
}

export interface DemoJourney {
  businessName: string;
  isDemoBusiness: boolean;
  stages: JourneyStage[];
}

export const DEMO_BUSINESS_NAME = "Bella's Boutique";

/**
 * Build the fast-forward journey for the authenticated business user.
 * Ownership is resolved from the session-supplied userId; no client tenant id.
 */
export async function getDemoJourney(userId: string): Promise<DemoJourney | null> {
  const business = await prisma.businessProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      companyName: true,
      assessments: { where: { status: "COMPLETED" }, select: { id: true }, take: 1 },
      analyses: { select: { id: true }, take: 1 },
      opportunities: { select: { id: true }, take: 1 },
      conversations: {
        select: { id: true, _count: { select: { messages: true } } },
        take: 1,
      },
      requirements: { select: { id: true }, take: 1 },
      matchRequests: {
        where: { status: "COMPLETED" },
        select: { id: true, _count: { select: { matchResults: true } } },
        take: 1,
      },
    },
  });

  if (!business) return null;

  const stages: JourneyStage[] = [
    { key: "profile", label: "Business Profile", href: "/business/profile", complete: true },
    {
      key: "assessment",
      label: "Growth Assessment",
      href: "/business/assessment",
      complete: business.assessments.length > 0,
    },
    {
      key: "analysis",
      label: "AI Health Analysis",
      href: "/business/analysis",
      complete: business.analyses.length > 0,
    },
    {
      key: "opportunities",
      label: "Opportunities",
      href: "/business/opportunities",
      complete: business.opportunities.length > 0,
    },
    {
      key: "advisor",
      label: "AI Advisor",
      href: "/business/advisor",
      complete: (business.conversations[0]?._count.messages ?? 0) > 0,
    },
    {
      key: "requirements",
      label: "Requirements",
      href: "/business/requirements",
      complete: business.requirements.length > 0,
    },
    {
      key: "recommendations",
      label: "Recommendations",
      href: "/business/recommendations",
      complete: (business.matchRequests[0]?._count.matchResults ?? 0) > 0,
    },
  ];

  return {
    businessName: business.companyName,
    isDemoBusiness: business.companyName === DEMO_BUSINESS_NAME,
    stages,
  };
}

/**
 * Platform-wide demo readiness status (used by GET /api/demo/status).
 * Reads real counts — no AI, no mutation.
 */
export async function getDemoStatus() {
  const demoBusiness = await prisma.businessProfile.findFirst({
    where: { companyName: DEMO_BUSINESS_NAME },
    select: { id: true, companyName: true },
  });

  const [businesses, professionals, analyses, matchResults] = await Promise.all([
    prisma.businessProfile.count(),
    prisma.professionalProfile.count(),
    prisma.businessAnalysis.count(),
    prisma.matchResult.count(),
  ]);

  return {
    demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
    ready: !!demoBusiness,
    demoBusiness,
    counts: { businesses, professionals, analyses, matchResults },
  };
}
