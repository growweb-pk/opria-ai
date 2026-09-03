"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

const STAGES = [
  "Reading your business profile...",
  "Analyzing your digital presence...",
  "Evaluating growth opportunities...",
  "Scoring business health dimensions...",
  "Preparing your business profile...",
];

/**
 * Animated analysis screen shown while the AI analysis pipeline runs.
 * Cycles through meaningful progress stages without falsely implying
 * that individual AI stages are actually completed.
 */
export function AnalysisAnimation({ onComplete }: { onComplete?: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        const next = prev + 1;
        if (next >= STAGES.length) {
          // Keep cycling on the last stage — don't imply completion
          return prev;
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Animated rings */}
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-primary/60" style={{ animationDuration: "3s", animationDirection: "reverse" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>

      {/* Stage text */}
      <div className="text-center space-y-3">
        <p className="text-lg font-medium text-foreground transition-opacity duration-500">
          {STAGES[stageIndex]}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>This usually takes 10-15 seconds</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {STAGES.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-2 rounded-full transition-all duration-500 ${
              idx <= stageIndex ? "bg-primary scale-110" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
