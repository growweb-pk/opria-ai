/**
 * Gemini Adapter
 *
 * Implements the AIProviderAdapter interface using the official @google/genai SDK.
 * Supports structured JSON output, streaming, and conversation.
 *
 * All Gemini calls happen server-side — the API key is never exposed to the browser.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type {
  AIProviderAdapter,
  ChatMessage,
  StructuredCallOptions,
} from "../types";
import {
  AIProviderError,
  AIValidationError,
  AIRateLimitError,
} from "../types";

export class GeminiAdapter implements AIProviderAdapter {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.AI_API_KEY });
  }

  /**
   * Gemini has no multi-model fallback — if a comma-separated chain is
   * configured, use the first entry.
   */
  private resolveModel(modelOption: string | undefined): string {
    const raw = modelOption ?? env.AI_MODEL;
    return raw.split(",")[0].trim();
  }

  async callStructured<T extends z.ZodType>(
    userPrompt: string,
    outputSchema: T,
    options: StructuredCallOptions
  ): Promise<z.infer<T>> {
    const systemPrompt =
      options.systemPrompt ??
      "You are a precise AI assistant. Respond only with valid JSON matching the required schema. Do not include markdown code fences or explanatory text outside the JSON object.";

    try {
      const response = await this.ai.models.generateContent({
        model: this.resolveModel(options.model),
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: options.maxTokens ?? env.AI_MAX_TOKENS,
          temperature: options.temperature ?? 0.3,
          responseMimeType: "application/json",
        },
      });

      const content = response.text;
      if (!content) {
        throw new AIProviderError("Empty response from Gemini");
      }

      // Strip markdown code fences if Gemini includes them despite JSON mode
      const cleaned = this.stripMarkdownFences(content);
      const parsed = JSON.parse(cleaned);
      return outputSchema.parse(parsed);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      // handleError always throws, but TypeScript needs this for type safety
      throw new AIProviderError(`Gemini structured call failed: ${err.message}`, err);
    }
  }

  async callStreaming(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<AsyncIterable<string>> {
    try {
      const stream = await this.ai.models.generateContentStream({
        model: this.resolveModel(options.model),
        contents: this.formatContents(messages),
        config: {
          maxOutputTokens: options.maxTokens ?? env.AI_MAX_TOKENS,
          temperature: options.temperature ?? 0.7,
        },
      });

      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              const { value, done } = await stream[Symbol.asyncIterator]().next();
              if (done) return { value: undefined, done: true };
              const text = value.text ?? "";
              return { value: text, done: false };
            },
          };
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw new AIProviderError(`Gemini streaming failed: ${err.message}`, err);
    }
  }

  async callConversation(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.resolveModel(options.model),
        contents: this.formatContents(messages),
        config: {
          maxOutputTokens: options.maxTokens ?? env.AI_MAX_TOKENS,
          temperature: options.temperature ?? 0.7,
        },
      });

      const content = response.text;
      if (!content) {
        throw new AIProviderError("Empty response from Gemini");
      }

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw new AIProviderError(`Gemini conversation failed: ${err.message}`, err);
    }
  }

  /**
   * Convert our ChatMessage[] to Gemini's Content format.
   * Gemini uses 'model' instead of 'assistant', and expects Content[] with parts.
   */
  private formatContents(
    messages: ChatMessage[]
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages
      .filter((m) => m.role !== "system") // System handled separately
      .map((m) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }],
      }));
  }

  /**
   * Strip markdown code fences from AI output.
   * Gemini sometimes wraps JSON in ```json ... ``` even with responseMimeType set.
   */
  private stripMarkdownFences(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith("```")) {
      // Remove opening fence (```json or ```) and closing fence
      const lines = trimmed.split("\n");
      const start = lines[0].startsWith("```") ? 1 : 0;
      const end =
        lines[lines.length - 1].trim() === "```" ? lines.length - 1 : lines.length;
      return lines.slice(start, end).join("\n").trim();
    }
    return trimmed;
  }

  private handleError(error: Error): never {
    // Gemini SDK throws ApiError for API errors
    const err = error as Error & { status?: number };

    if (err.status === 429) {
      throw new AIRateLimitError("Gemini rate limit exceeded");
    }
    if (err.status === 503) {
      throw new AIRateLimitError("Gemini service unavailable");
    }

    if (error instanceof SyntaxError) {
      throw new AIValidationError("Gemini returned invalid JSON");
    }

    if (error instanceof z.ZodError) {
      throw new AIValidationError(
        `Gemini response failed validation: ${error.message}`
      );
    }

    throw new AIProviderError(`Gemini error: ${error.message}`, error);
  }
}
