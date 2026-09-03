"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Play, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface JourneyStage {
  key: string;
  label: string;
  href: string;
  complete: boolean;
}

export interface DemoJourneyData {
  businessName: string;
  isDemoBusiness: boolean;
  stages: JourneyStage[];
}

const STORAGE_KEY = "opria:demo-mode";

/**
 * Phase 7 — Demo fast-forward control.
 *
 * Shows the full Bella's Boutique journey as one-click jumps. Every stage reads
 * PRE-SEEDED, persisted AI outputs, so fast-forwarding never triggers a live AI
 * call. The "Demo Mode" toggle is a persisted (localStorage) indicator that the
 * data on screen is the pre-computed demo scenario.
 */
export function DemoJourney({
  journey,
  demoModeEnabled,
}: {
  journey: DemoJourneyData;
  demoModeEnabled: boolean;
}) {
  const [demoMode, setDemoMode] = useState(demoModeEnabled);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on") setDemoMode(true);
    else if (stored === "off") setDemoMode(false);
  }, []);

  function toggleDemoMode() {
    setDemoMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      }
      return next;
    });
  }

  const completedCount = journey.stages.filter((s) => s.complete).length;
  const showBadge = mounted && demoMode;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-4 w-4 text-primary" />
            Demo Journey — Fast Forward
          </CardTitle>
          <CardDescription>
            {journey.businessName} · {completedCount}/{journey.stages.length} stages
            ready. Jump to any stage — all data is pre-seeded (zero live AI).
          </CardDescription>
        </div>
        <Button
          type="button"
          variant={demoMode ? "default" : "outline"}
          size="sm"
          onClick={toggleDemoMode}
          aria-pressed={demoMode}
          className="shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          Demo Mode {demoMode ? "On" : "Off"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {showBadge && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Demo data active.</strong> Screens show the pre-computed{" "}
              {journey.businessName} scenario. Fast-forwarding reuses persisted AI
              outputs — no new AI calls are made.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {journey.stages.map((stage, index) => (
            <Button
              key={stage.key}
              asChild
              variant={stage.complete ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "gap-2",
                stage.complete && "text-foreground"
              )}
            >
              <Link href={stage.href}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                {stage.label}
                {stage.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
