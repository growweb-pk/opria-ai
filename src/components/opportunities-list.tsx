"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Lightbulb,
  Sparkles,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────

interface OpportunityDetails {
  impact?: string;
  feasibility?: string;
  description?: string;
  reasoning?: string;
  estimatedTimeline?: string | null;
  estimatedInvestment?: string | null;
  requiredCapabilities?: string[];
  source?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  category: string;
  priority: "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";
  confidence: number;
  details: OpportunityDetails;
  status: string;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  IMMEDIATE: { label: "Immediate", color: "bg-red-100 text-red-700 border-red-200", icon: Zap },
  SHORT_TERM: { label: "Short Term", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  MEDIUM_TERM: { label: "Medium Term", color: "bg-blue-100 text-blue-700 border-blue-200", icon: TrendingUp },
  LONG_TERM: { label: "Long Term", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
};

const PRIORITY_ORDER: Record<string, number> = {
  IMMEDIATE: 0,
  SHORT_TERM: 1,
  MEDIUM_TERM: 2,
  LONG_TERM: 3,
};

const CATEGORY_LABELS: Record<string, string> = {
  digital_transformation: "Digital Transformation",
  market_expansion: "Market Expansion",
  operational_efficiency: "Operational Efficiency",
  technology_adoption: "Technology Adoption",
  customer_experience: "Customer Experience",
  revenue_diversification: "Revenue Diversification",
  brand_and_marketing: "Brand & Marketing",
  human_capital: "Human Capital",
  automation: "Automation",
  ai_readiness: "AI Readiness",
};

// ─── Component ───────────────────────────────────────────

export function OpportunitiesClient({
  initialOpportunities,
  hasAnalysis,
}: {
  initialOpportunities: Opportunity[];
  hasAnalysis: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [discovering, setDiscovering] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Derive unique categories present in the data
  const categories = Array.from(
    new Set(opportunities.map((o) => o.category))
  ).sort();

  const handleDiscover = async () => {
    if (discovering) return;
    setDiscovering(true);

    try {
      const res = await fetch("/api/opportunities", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to discover opportunities");
      }

      // Fetch full list via GET for consistent display
      const getRes = await fetch("/api/opportunities");
      const getData = await getRes.json();

      if (getRes.ok) {
        setOpportunities(getData.opportunities);
      }

      toast({
        title: "Opportunities discovered",
        description: `${data.opportunities?.length ?? 0} opportunities identified.`,
      });

      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Discovery failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setDiscovering(false);
    }
  };

  // Sort by priority (IMMEDIATE first), then apply category filter
  const sorted = [...opportunities]
    .filter((o) => !categoryFilter || o.category === categoryFilter)
    .sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    );

  // No analysis yet — cannot discover
  if (!hasAnalysis) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="mt-1 text-muted-foreground">
            AI-identified growth opportunities for your business
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">Analysis required</p>
              <p className="text-sm text-muted-foreground mt-1">
                You need to complete a business health analysis before
                opportunities can be identified.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/business/analysis")}>
              Go to Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No opportunities yet — show discover button
  if (opportunities.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="mt-1 text-muted-foreground">
            AI-identified growth opportunities for your business
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No opportunities yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run AI opportunity discovery to identify growth opportunities
                based on your business analysis.
              </p>
            </div>
            <Button onClick={handleDiscover} disabled={discovering} size="lg">
              {discovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discovering opportunities...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discover Opportunities
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show opportunities
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="mt-1 text-muted-foreground">
            {opportunities.length} opportunities identified, sorted by priority
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDiscover}
          disabled={discovering}
          size="sm"
        >
          {discovering ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Re-discover
        </Button>
      </div>

      {/* Category Filters */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            All ({opportunities.length})
          </button>
          {categories.map((cat) => {
            const count = opportunities.filter((o) => o.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Opportunity Cards */}
      <div className="space-y-3">
        {sorted.map((opp) => {
          const priorityCfg = PRIORITY_CONFIG[opp.priority] ?? PRIORITY_CONFIG.LONG_TERM;
          const PriorityIcon = priorityCfg.icon;
          const isExpanded = expandedId === opp.id;
          const details = opp.details ?? {};

          return (
            <Card
              key={opp.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : opp.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">
                      {opp.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityCfg.color}`}
                      >
                        <PriorityIcon className="h-3 w-3" />
                        {priorityCfg.label}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABELS[opp.category] ?? opp.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {Math.round(opp.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {opp.status}
                  </span>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {details.description && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Description</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {details.description}
                      </p>
                    </div>
                  )}
                  {details.reasoning && (
                    <div>
                      <p className="text-sm font-medium text-foreground">Reasoning</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {details.reasoning}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {details.impact && (
                      <div>
                        <p className="text-xs text-muted-foreground">Impact</p>
                        <p className="text-sm font-medium capitalize">{details.impact}</p>
                      </div>
                    )}
                    {details.feasibility && (
                      <div>
                        <p className="text-xs text-muted-foreground">Feasibility</p>
                        <p className="text-sm font-medium capitalize">{details.feasibility}</p>
                      </div>
                    )}
                    {details.estimatedTimeline && (
                      <div>
                        <p className="text-xs text-muted-foreground">Timeline</p>
                        <p className="text-sm font-medium">{details.estimatedTimeline}</p>
                      </div>
                    )}
                    {details.estimatedInvestment && (
                      <div>
                        <p className="text-xs text-muted-foreground">Investment</p>
                        <p className="text-sm font-medium">{details.estimatedInvestment}</p>
                      </div>
                    )}
                  </div>
                  {details.requiredCapabilities && details.requiredCapabilities.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Required Capabilities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {details.requiredCapabilities.map((cap, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {details.source && (
                    <p className="text-xs text-muted-foreground">
                      Source:{" "}
                      <span className="font-medium">{details.source}</span>
                    </p>
                  )}
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/business/advisor?opportunityId=${opp.id}`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Pursue This
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
