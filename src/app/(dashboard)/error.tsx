"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Phase 7 — dashboard error boundary. Catches runtime errors in any dashboard
 * route (including transient database/connection failures) and offers a retry
 * instead of an unhandled error overlay.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      <div className="space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            We couldn&apos;t load this page. This is often a temporary connection
            issue — please try again.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button type="button" onClick={reset} size="sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
