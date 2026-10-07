/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

import { z } from "zod";

/**
 * Renders a Zod schema as a compact TypeScript-like shape string so it can be
 * embedded in an LLM system prompt. Free-tier models frequently invent or
 * rename fields when the schema is only described loosely — showing the exact
 * field names and value types dramatically improves first-attempt validation.
 *
 * Only the constructs used by this codebase's agent schemas are rendered;
 * anything unrecognized falls back to `unknown` rather than throwing, so the
 * hint can never break the AI call.
 */
export function schemaOutline(schema: z.ZodTypeAny, depth = 0): string {
  if (depth > 6) return "unknown";

  const def = schema._def as Record<string, unknown> & {
    typeName?: string;
  };
  const typeName = def.typeName as string | undefined;

  switch (typeName) {
    case "ZodObject": {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape as Record<
        string,
        z.ZodTypeAny
      >;
      const fields = Object.entries(shape).map(
        ([key, value]) => `${key}: ${schemaOutline(value, depth + 1)}`
      );
      return `{ ${fields.join("; ")} }`;
    }
    case "ZodArray": {
      const min = (def.checks as Array<{ kind: string; value?: number }> | undefined)?.find(
        (c) => c.kind === "min"
      )?.value;
      const inner = schemaOutline(def.type as z.ZodTypeAny, depth + 1);
      return min ? `${inner}[] (at least ${min})` : `${inner}[]`;
    }
    case "ZodString": {
      const min = (def.checks as Array<{ kind: string; value?: number }> | undefined)?.find(
        (c) => c.kind === "min"
      )?.value;
      return min ? `string (min ${min} chars)` : "string";
    }
    case "ZodNumber": {
      const num = schema as z.ZodNumber;
      const lo = num.minValue;
      const hi = num.maxValue;
      const range = [lo, hi].every((v) => typeof v === "number")
        ? ` (${lo}-${hi})`
        : "";
      return `number${range}`;
    }
    case "ZodBoolean":
      return "boolean";
    case "ZodEnum": {
      const values = def.values as string[];
      return values.map((v) => `"${v}"`).join(" | ");
    }
    case "ZodNullable":
      return `${schemaOutline(def.innerType as z.ZodTypeAny, depth + 1)} | null`;
    case "ZodOptional":
      return `${schemaOutline(def.innerType as z.ZodTypeAny, depth + 1)} (optional)`;
    case "ZodDefault":
      return schemaOutline(def.innerType as z.ZodTypeAny, depth + 1);
    case "ZodEffects":
      return schemaOutline(def.schema as z.ZodTypeAny, depth + 1);
    case "ZodLiteral":
      return JSON.stringify(def.value);
    case "ZodUnion": {
      const options = def.options as z.ZodTypeAny[];
      return options.map((o) => schemaOutline(o, depth + 1)).join(" | ");
    }
    default:
      return "unknown";
  }
}
