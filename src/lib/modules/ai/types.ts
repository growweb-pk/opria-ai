/**
 * AI Provider Types
 *
 * Shared types for the AI provider abstraction layer.
 * All adapters (OpenAI, Gemini) implement these interfaces.
 */

import { z } from "zod";

// ─── Configuration ───────────────────────────────────────

export interface AIProviderConfig {
  provider: string;
  model: string;
  maxTokens: number;
  baseUrl?: string;
}

export interface StructuredCallOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** Override the configured model for this call (falls back to AI_MODEL). */
  model?: string;
}

// ─── Message Types ───────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "model";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// ─── Provider Adapter Interface ──────────────────────────

/**
 * Interface that all AI provider adapters must implement.
 * Business modules never call providers directly — they go through this interface.
 */
export interface AIProviderAdapter {
  /**
   * Call the AI with a prompt and parse the response into a structured Zod schema.
   * Returns validated output or throws on failure.
   */
  callStructured<T extends z.ZodType>(
    userPrompt: string,
    outputSchema: T,
    options: StructuredCallOptions
  ): Promise<z.infer<T>>;

  /**
   * Call the AI with streaming for conversational interfaces.
   * Returns an async iterable of text chunks.
   */
  callStreaming(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<AsyncIterable<string>>;

  /**
   * Call the AI with conversation messages (non-streaming).
   * Used for advisor conversations where we need the full response.
   */
  callConversation(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<string>;
}

// ─── Errors ──────────────────────────────────────────────

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIValidationError extends AIProviderError {
  constructor(
    message: string,
    public readonly rawOutput?: string
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}

export class AIRateLimitError extends AIProviderError {
  constructor(message: string) {
    super(message);
    this.name = "AIRateLimitError";
  }
}
