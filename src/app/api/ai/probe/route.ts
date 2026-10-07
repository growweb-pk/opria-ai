/*
 * Opria
 * Copyright © 2026 GrowWeb IT Company / Ameer Hamza Arshad.
 * All rights reserved.
 *
 * Proprietary and confidential source code.
 * Unauthorized reproduction, distribution, or commercial use
 * is prohibited without written permission from the rights holder.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getProviderConfig } from "@/lib/modules/ai/provider";
import { env } from "@/lib/config/env";

export const maxDuration = 60;

interface ModelProbeResult {
  model: string;
  ok: boolean;
  status: number | null;
  ms: number | null;
  finishReason: string | null;
  error: string | null;
}

/**
 * POST /api/ai/probe (admin only)
 * Sends a tiny request to every model in the configured fallback chain so
 * admins can see which upstreams are reachable from the deployment's network.
 * Never echoes the API key; reveals only per-model reachability.
 */
export async function POST() {
  try {
    await requireAuth(["ADMIN"]);

    const chain = (env.AI_MODEL ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const prompt = 'Reply with exactly: {"ok":true}';
    const results: ModelProbeResult[] = [];

    for (const model of chain) {
      const t0 = Date.now();
      try {
        const res = await fetch(
          `${env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.AI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 32,
            }),
            signal: AbortSignal.timeout(20_000),
          }
        );
        const data = await res.json().catch(() => ({}));
        results.push({
          model,
          ok: res.ok,
          status: res.status,
          ms: Date.now() - t0,
          finishReason: data.choices?.[0]?.finish_reason ?? null,
          error: res.ok
            ? null
            : (data.error?.message ?? `HTTP ${res.status}`).slice(0, 200),
        });
      } catch (error) {
        results.push({
          model,
          ok: false,
          status: null,
          ms: Date.now() - t0,
          finishReason: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json(
      { provider: getProviderConfig().provider, chain: env.AI_MODEL, results },
      { status: 200 }
    );
  } catch (error) {
    // requireAuth() redirects unauthenticated/forbidden users — let it through
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("POST /api/ai/probe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
