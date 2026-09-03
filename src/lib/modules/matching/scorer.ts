/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

/**
 * Deterministic Structured Matching Scorer
 *
 * Implements Phase 5 / Blueprint Section 14.1 structured scoring.
 * This module is PURE and DETERMINISTIC — no AI, no I/O, no randomness.
 * The same inputs always produce the same scores, which is what makes
 * every match fully traceable and auditable.
 *
 * Canonical 7 weighted factors (Section 14.1):
 *   Skill Match          30%   Jaccard similarity (required vs professional skills)
 *   Industry Experience  15%   Business industry vs professional industryExpertise
 *   Reputation           15%   Normalized reputation (0-5 → 0-1)
 *   Portfolio Quality    10%   Portfolio item count + diversity
 *   Availability         10%   AVAILABLE=1.0, BUSY=0.5, UNAVAILABLE=0.0
 *   Budget Fit           10%   Overlap between requirement budget & professional range
 *   Verification Status  10%   VERIFIED=1.0, PENDING=0.3, REJECTED=0.0
 *
 *   Structured Score = Σ (factor × weight) × 100
 *
 * Canonical composite (Section 14.1 / Decision #7):
 *   Final Score = (0.70 × Structured Score) + (0.30 × AI Semantic Score)
 *
 * Phase 1 eligibility filtering (Section 14.1):
 *   HARD: ≥1 matching required skill AND availability ∈ {AVAILABLE, BUSY}
 *   SOFT: verification & budget are scored, not excluded ("VERIFIED preferred",
 *         "budget compatibility pre-filter" are preferences, not hard gates).
 */

import type { ProfessionalProfile } from "@prisma/client";

// ─── Canonical weights (DO NOT change silently — Blueprint §14.1) ───

export const FACTOR_WEIGHTS = {
  skillMatch: 0.3,
  industryExperience: 0.15,
  reputation: 0.15,
  portfolioQuality: 0.1,
  availability: 0.1,
  budgetFit: 0.1,
  verification: 0.1,
} as const;

export const COMPOSITE_WEIGHTS = {
  structured: 0.7,
  ai: 0.3,
} as const;

export type FactorKey = keyof typeof FACTOR_WEIGHTS;

const FACTOR_LABELS: Record<FactorKey, string> = {
  skillMatch: "Skill Match",
  industryExperience: "Industry Experience",
  reputation: "Reputation",
  portfolioQuality: "Portfolio Quality",
  availability: "Availability",
  budgetFit: "Budget Fit",
  verification: "Verification Status",
};

// ─── Types ───────────────────────────────────────────────

export interface RequirementMatchContext {
  /** Flattened required skills from the requirement's professionalCategories */
  requiredSkills: string[];
  /** Business industry used for the Industry Experience factor */
  businessIndustry: string;
  /** Parsed requirement budget range (null when unspecified) */
  budgetMin: number | null;
  budgetMax: number | null;
}

export interface FactorScore {
  key: FactorKey;
  label: string;
  weight: number;
  /** Normalized 0-1 factor value */
  normalized: number;
  /** Factor value on a 0-100 scale */
  score: number;
}

export interface StructuredScoreResult {
  /** Composite structured score 0-100 */
  structuredScore: number;
  /** Full per-factor traceability breakdown */
  factors: FactorScore[];
  /**
   * Flat, seed-compatible 0-100 key/value breakdown. Keys mirror the demo
   * seed's scoreBreakdown shape so a single UI renders seeded and live data.
   */
  breakdown: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────

const norm = (value: string): string => value.trim().toLowerCase();

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Parse a human budget string like "$10,000 - $20,000" into a numeric range.
 * Returns nulls when nothing parseable is present. Deterministic.
 */
export function parseBudgetRange(
  estimated?: string | null
): { min: number | null; max: number | null } {
  if (!estimated) return { min: null, max: null };
  const numbers = estimated
    .replace(/[^0-9.\-]+/g, " ")
    .split(" ")
    .map((n) => parseFloat(n))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (numbers.length === 0) return { min: null, max: null };
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

// ─── Factor computations (each returns a normalized 0-1 value) ───

function skillMatchFactor(
  ctx: RequirementMatchContext,
  p: ProfessionalProfile
): number {
  const required = new Set(ctx.requiredSkills.map(norm).filter(Boolean));
  const have = new Set(p.skills.map(norm).filter(Boolean));
  if (required.size === 0 || have.size === 0) return 0;

  let intersection = 0;
  for (const skill of Array.from(required)) {
    if (have.has(skill)) intersection += 1;
  }
  const union = required.size + have.size - intersection;
  if (union === 0) return 0;
  // Jaccard similarity
  return intersection / union;
}

function industryFactor(
  ctx: RequirementMatchContext,
  p: ProfessionalProfile
): number {
  const businessIndustry = norm(ctx.businessIndustry);
  if (!businessIndustry) return 0;
  const expertise = p.industryExpertise.map(norm).filter(Boolean);
  if (expertise.length === 0) return 0;

  if (expertise.some((e) => e === businessIndustry)) return 1;
  // Partial token overlap (e.g. "e-commerce" vs "ecommerce", "retail" contains)
  if (
    expertise.some(
      (e) => e.includes(businessIndustry) || businessIndustry.includes(e)
    )
  ) {
    return 0.7;
  }
  return 0;
}

function reputationFactor(p: ProfessionalProfile): number {
  const reputation = typeof p.reputation === "number" ? p.reputation : 0;
  return Math.max(0, Math.min(1, reputation / 5));
}

function portfolioFactor(p: ProfessionalProfile): number {
  const portfolio = p.portfolio;
  if (!portfolio) return 0;

  let items: unknown[] = [];
  if (Array.isArray(portfolio)) {
    items = portfolio;
  } else if (typeof portfolio === "object") {
    const maybeItems = (portfolio as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) items = maybeItems;
  }
  if (items.length === 0) return 0;

  // Count component, capped at 10 items
  const countScore = Math.min(1, items.length / 10);

  // Diversity component: unique tags/categories/skills across items, capped at 5
  const tags = new Set<string>();
  for (const item of items) {
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const tag = rec.tag ?? rec.category ?? rec.type;
      if (typeof tag === "string") tags.add(norm(tag));
      if (Array.isArray(rec.skills)) {
        for (const s of rec.skills) {
          if (typeof s === "string") tags.add(norm(s));
        }
      }
    }
  }
  const diversityScore = Math.min(1, tags.size / 5);

  return 0.6 * countScore + 0.4 * diversityScore;
}

function availabilityFactor(p: ProfessionalProfile): number {
  switch (p.availability) {
    case "AVAILABLE":
      return 1;
    case "BUSY":
      return 0.5;
    case "UNAVAILABLE":
      return 0;
    default:
      return 0;
  }
}

function budgetFactor(
  ctx: RequirementMatchContext,
  p: ProfessionalProfile
): number {
  // No requirement budget → neutral (cannot evaluate fit)
  if (ctx.budgetMin == null && ctx.budgetMax == null) return 0.5;
  // Professional exposes no project range → neutral (unknown)
  if (p.projectMinBudget == null && p.projectMaxBudget == null) return 0.5;

  const reqMin = ctx.budgetMin ?? p.projectMinBudget ?? 0;
  const reqMax = ctx.budgetMax ?? p.projectMaxBudget ?? reqMin;
  const pMin = p.projectMinBudget ?? reqMin;
  const pMax = p.projectMaxBudget ?? pMin;

  const lo = Math.max(reqMin, pMin);
  const hi = Math.min(reqMax, pMax);
  if (hi < lo) {
    // No overlap — small proximity credit, never zero-out a good skill match
    return 0.1;
  }
  const overlap = hi - lo;
  const reqSpan = Math.max(1, reqMax - reqMin);
  return Math.max(0, Math.min(1, overlap / reqSpan));
}

function verificationFactor(p: ProfessionalProfile): number {
  switch (p.verification) {
    case "VERIFIED":
      return 1;
    case "PENDING":
      return 0.3;
    case "REJECTED":
      return 0;
    default:
      return 0;
  }
}

// ─── Public scoring API ──────────────────────────────────

/**
 * Phase 1 eligibility filtering (Blueprint §14.1).
 * HARD gates: at least one required skill match, and availability is not
 * UNAVAILABLE. Verification/budget are intentionally NOT hard gates.
 */
export function filterEligibleProfessionals(
  professionals: ProfessionalProfile[],
  ctx: RequirementMatchContext
): ProfessionalProfile[] {
  const required = new Set(ctx.requiredSkills.map(norm).filter(Boolean));

  return professionals.filter((p) => {
    if (p.availability === "UNAVAILABLE") return false;
    if (required.size === 0) {
      // No explicit skills to match on — keep available professionals
      return true;
    }
    const have = new Set(p.skills.map(norm).filter(Boolean));
    for (const skill of Array.from(required)) {
      if (have.has(skill)) return true;
    }
    return false;
  });
}

/**
 * Compute the deterministic structured score for one professional.
 * Returns the composite 0-100 score plus a full per-factor breakdown.
 */
export function scoreProfessionalStructured(
  professional: ProfessionalProfile,
  ctx: RequirementMatchContext
): StructuredScoreResult {
  const normalized: Record<FactorKey, number> = {
    skillMatch: skillMatchFactor(ctx, professional),
    industryExperience: industryFactor(ctx, professional),
    reputation: reputationFactor(professional),
    portfolioQuality: portfolioFactor(professional),
    availability: availabilityFactor(professional),
    budgetFit: budgetFactor(ctx, professional),
    verification: verificationFactor(professional),
  };

  let structured = 0;
  const factors: FactorScore[] = (
    Object.keys(FACTOR_WEIGHTS) as FactorKey[]
  ).map((key) => {
    const weight = FACTOR_WEIGHTS[key];
    const value = normalized[key];
    structured += value * weight;
    return {
      key,
      label: FACTOR_LABELS[key],
      weight,
      normalized: Math.round(value * 1000) / 1000,
      score: round1(value * 100),
    };
  });

  const structuredScore = round1(structured * 100);

  // Seed-compatible flat breakdown (0-100 scale). Keys align with the demo
  // seed so one UI component renders both seeded and live match results.
  const breakdown: Record<string, number> = {
    skillMatch: round1(normalized.skillMatch * 100),
    industryFit: round1(normalized.industryExperience * 100),
    reputationScore: round1(normalized.reputation * 100),
    portfolioQuality: round1(normalized.portfolioQuality * 100),
    availabilityFit: round1(normalized.availability * 100),
    budgetFit: round1(normalized.budgetFit * 100),
    verificationFit: round1(normalized.verification * 100),
  };

  return { structuredScore, factors, breakdown };
}

/**
 * Canonical composite ranking score: 70% structured + 30% AI (Blueprint §14.1).
 */
export function computeFinalScore(
  structuredScore: number,
  aiScore: number
): number {
  return round1(
    COMPOSITE_WEIGHTS.structured * structuredScore +
      COMPOSITE_WEIGHTS.ai * aiScore
  );
}

/**
 * Rank a list of scored candidates by final score (descending), assigning
 * 1-based ranks. Ties are broken deterministically by professionalId to keep
 * ordering stable and reproducible.
 */
export function rankCandidates<T extends { finalScore: number; professionalId: string }>(
  candidates: T[]
): Array<T & { rank: number }> {
  const sorted = [...candidates].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.professionalId.localeCompare(b.professionalId);
  });
  return sorted.map((c, index) => ({ ...c, rank: index + 1 }));
}
