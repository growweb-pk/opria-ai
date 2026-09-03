/**
 * Provenance Tracking
 *
 * Every AI-generated conclusion must have provenance — a label indicating
 * whether the data was provided by the user, inferred by AI, or recommended.
 *
 * The system must not present an AI inference as a fact supplied by the business.
 */

// ─── Provenance Types ────────────────────────────────────

export type Provenance = "PROVIDED" | "INFERRED" | "RECOMMENDED";

export interface ProvenanceField<T> {
  value: T;
  source: Provenance;
  confidence?: number; // 0.0 to 1.0
  reasoning?: string; // Why this was inferred/recommended
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Create a provenance-tracked field.
 */
export function provided<T>(value: T): ProvenanceField<T> {
  return { value, source: "PROVIDED" };
}

export function inferred<T>(
  value: T,
  confidence: number,
  reasoning?: string
): ProvenanceField<T> {
  return { value, source: "INFERRED", confidence, reasoning };
}

export function recommended<T>(
  value: T,
  confidence: number,
  reasoning?: string
): ProvenanceField<T> {
  return { value, source: "RECOMMENDED", confidence, reasoning };
}

// ─── Zod Schemas ─────────────────────────────────────────

import { z } from "zod";

export const ProvenanceEnum = z.enum(["PROVIDED", "INFERRED", "RECOMMENDED"]);

export const ProvenanceFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    source: ProvenanceEnum,
    confidence: z.number().min(0).max(1).optional(),
    reasoning: z.string().optional(),
  });
