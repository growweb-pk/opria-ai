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
 * AI Provider Abstraction Layer
 *
 * This is the single entry point for all AI calls in Opria.
 * Business modules import from here — they never import provider-specific SDKs.
 *
 * Architecture:
 *   AI Agent Module
 *       ↓
 *   Provider Interface (this file)
 *       ↓
 *   Provider Adapter (gemini.ts or openai.ts)
 *       ↓
 *   External API (Gemini / OpenAI)
 *
 * To switch providers, change AI_PROVIDER and AI_API_KEY environment variables.
 * The interface remains identical regardless of the underlying provider.
 */

import { z } from "zod";
import { env } from "@/lib/config/env";
import { OpenAIAdapter } from "./adapters/openai";
import { GeminiAdapter } from "./adapters/gemini";
import { schemaOutline } from "./schema-outline";
import type {
  AIProviderAdapter,
  AIProviderConfig,
  ChatMessage,
  StructuredCallOptions,
} from "./types";

// ─── Adapter Factory ──────────────────────────────────────

let _adapter: AIProviderAdapter | null = null;

function getAdapter(): AIProviderAdapter {
  if (_adapter) return _adapter;

  const provider = env.AI_PROVIDER;

  switch (provider) {
    case "gemini":
      _adapter = new GeminiAdapter();
      break;
    case "openai":
    case "custom":
      _adapter = new OpenAIAdapter();
      break;
    default:
      throw new Error(
        `Unsupported AI provider: ${provider}. Supported: gemini, openai, custom`
      );
  }

  return _adapter;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Model for structured-output agents (analysis, research, matching,
 * explanation, requirements, opportunities). Falls back to AI_MODEL.
 */
export function structuredModel(): string {
  return env.AI_MODEL_JSON ?? env.AI_MODEL;
}

/**
 * Model for the advisor conversational agent. Falls back to AI_MODEL.
 */
export function chatModel(): string {
  return env.AI_MODEL_CHAT ?? env.AI_MODEL;
}

/**
 * Call the AI with a user prompt and parse the response into a structured Zod schema.
 * Returns validated output or throws on failure.
 */
export async function callStructured<T extends z.ZodType>(
  userPrompt: string,
  outputSchema: T,
  options: StructuredCallOptions = {}
): Promise<z.infer<T>> {
  // Embed the exact output shape in the system prompt. Free-tier models
  // otherwise rename/drop fields, fail Zod validation, and burn the fallback
  // chain — each bad attempt costs 10-15s of generation time.
  let schemaHint = "";
  try {
    schemaHint = schemaOutline(outputSchema);
  } catch {
    // Never let a hint-generation bug break the AI call
  }

  const systemPrompt = schemaHint
    ? `${options.systemPrompt ?? "You are a precise AI assistant."}\n\nRespond with ONLY a JSON object that matches this exact shape — use these exact field names, nesting, and value types (numbers as numbers, booleans as booleans, arrays as arrays, no markdown fences, no commentary):\n${schemaHint}\n\nKeep every string field as short as the schema allows — short titles, 1-2 sentence descriptions. Prefer brief arrays over long prose.`
    : options.systemPrompt;

  return getAdapter().callStructured(userPrompt, outputSchema, {
    ...options,
    systemPrompt,
  });
}

/**
 * Call the AI with streaming for conversational interfaces.
 * Returns an async iterable of text chunks.
 */
export async function callStreaming(
  messages: ChatMessage[],
  options: StructuredCallOptions = {}
): Promise<AsyncIterable<string>> {
  return getAdapter().callStreaming(messages, options);
}

/**
 * Call the AI with conversation messages (non-streaming).
 * Used for advisor conversations where we need the full response.
 */
export async function callConversation(
  messages: ChatMessage[],
  options: StructuredCallOptions = {}
): Promise<string> {
  return getAdapter().callConversation(messages, options);
}

/**
 * Get the current provider configuration (for display/debugging).
 */
export function getProviderConfig(): AIProviderConfig {
  return {
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL,
    maxTokens: env.AI_MAX_TOKENS,
    baseUrl: env.AI_BASE_URL,
  };
}

// Re-export types and errors for convenience
export type {
  AIProviderConfig,
  AIProviderAdapter,
  ChatMessage,
  StructuredCallOptions,
} from "./types";

export {
  AIProviderError,
  AIValidationError,
  AIRateLimitError,
} from "./types";
