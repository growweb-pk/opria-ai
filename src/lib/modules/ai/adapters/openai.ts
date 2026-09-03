/**
 * OpenAI Adapter
 *
 * Implements the AIProviderAdapter interface using the OpenAI SDK.
 * This adapter is also compatible with any OpenAI-compatible API
 * (e.g., Groq, local models via LiteLLM) by setting AI_BASE_URL.
 */

import OpenAI from "openai";
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

export class OpenAIAdapter implements AIProviderAdapter {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_BASE_URL,
      maxRetries: 3,
      timeout: 60_000,
    });
  }

  async callStructured<T extends z.ZodType>(
    userPrompt: string,
    outputSchema: T,
    options: StructuredCallOptions
  ): Promise<z.infer<T>> {
    const systemPrompt =
      options.systemPrompt ??
      "You are a precise AI assistant. Respond only with valid JSON matching the required schema.";

    try {
      const response = await this.client.chat.completions.create({
        model: env.AI_MODEL,
        max_tokens: options.maxTokens ?? env.AI_MAX_TOKENS,
        temperature: options.temperature ?? 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderError("Empty response from OpenAI");
      }

      const parsed = JSON.parse(content);
      return outputSchema.parse(parsed);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      // handleError always throws, but TypeScript needs this for type safety
      throw new AIProviderError(`OpenAI structured call failed: ${err.message}`, err);
    }
  }

  async callStreaming(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<AsyncIterable<string>> {
    try {
      const stream = await this.client.chat.completions.create({
        model: env.AI_MODEL,
        max_tokens: options.maxTokens ?? env.AI_MAX_TOKENS,
        temperature: options.temperature ?? 0.7,
        messages: messages.map((m) => ({
          role: this.mapRole(m.role),
          content: m.content,
        })),
        stream: true,
      });

      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              const { value, done } = await stream[Symbol.asyncIterator]().next();
              if (done) return { value: undefined, done: true };
              const delta = value.choices[0]?.delta?.content ?? "";
              return { value: delta, done: false };
            },
          };
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw new AIProviderError(`OpenAI streaming failed: ${err.message}`, err);
    }
  }

  async callConversation(
    messages: ChatMessage[],
    options: StructuredCallOptions
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: env.AI_MODEL,
        max_tokens: options.maxTokens ?? env.AI_MAX_TOKENS,
        temperature: options.temperature ?? 0.7,
        messages: messages.map((m) => ({
          role: this.mapRole(m.role),
          content: m.content,
        })),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderError("Empty response from OpenAI");
      }

      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.handleError(err);
      throw new AIProviderError(`OpenAI conversation failed: ${err.message}`, err);
    }
  }

  private mapRole(role: string): "system" | "user" | "assistant" {
    if (role === "model") return "assistant";
    return role as "system" | "user" | "assistant";
  }

  private handleError(error: Error): never {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new AIRateLimitError("OpenAI rate limit exceeded");
      }
      if (error.status === 400 && error.message.includes("JSON")) {
        throw new AIValidationError("OpenAI returned invalid JSON");
      }
    }
    if (error instanceof z.ZodError) {
      throw new AIValidationError(
        `OpenAI response failed validation: ${error.message}`
      );
    }
    throw new AIProviderError(`OpenAI error: ${error.message}`, error);
  }
}
