/**
 * Route-level loading UI for every (dashboard) page.
 *
 * Renders a lightweight, structure-preserving skeleton (title bar + content
 * blocks) instead of a blank centered spinner, so navigation feels instant and
 * the layout does not shift when the real page streams in. Pure CSS pulse — no
 * animation framework, no client JavaScript.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>

      {/* Primary content skeleton — matches the card grid most pages render */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
      </div>

      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
