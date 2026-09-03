"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react";

// ─── Serializable view models (mapped from Prisma in the server page) ───

export type ResponseStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface OpportunityBusiness {
  companyName: string;
  industry: string;
  location: string;
}

export interface OpportunityRequirement {
  id: string;
  title: string;
  status: string;
  confidence: number;
  summary?: string;
  budget?: string;
  timeline?: string;
  lineItems?: { category: string; description: string }[];
  business: OpportunityBusiness;
}

export interface Opportunity {
  id: string; // MatchResult id
  finalScore: number;
  responseStatus: ResponseStatus;
  respondedAt: string | null;
  matchStatus: string;
  matchedAt: string;
  explanation: {
    headline?: string;
    reasoning?: string;
    skillOverlap?: string[];
    skillGaps?: string[];
    source?: string;
  };
  requirement: OpportunityRequirement;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-muted-foreground";
}

export function OpportunityFeed({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No matched opportunities yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              When a business requirement matches your skills and services, it will appear
              here with a full explanation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [pending, setPending] = useState<null | "ACCEPTED" | "DECLINED">(null);
  const [status, setStatus] = useState<ResponseStatus>(opportunity.responseStatus);
  const { explanation, requirement } = opportunity;

  async function respond(responseStatus: "ACCEPTED" | "DECLINED") {
    setPending(responseStatus);
    try {
      const res = await fetch("/api/professional/opportunities/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchResultId: opportunity.id,
          responseStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not update your response");
      }

      setStatus(responseStatus);
      toast({
        title: responseStatus === "ACCEPTED" ? "Opportunity accepted" : "Opportunity declined",
        description:
          responseStatus === "ACCEPTED"
            ? "The business has been notified of your interest."
            : "You can focus on other opportunities.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{requirement.title}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {requirement.business.companyName}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {requirement.business.location}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {requirement.business.industry}
              </span>
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-2xl font-bold ${scoreColor(opportunity.finalScore)}`}>
              {Math.round(opportunity.finalScore)}
            </p>
            <p className="text-xs text-muted-foreground">match score</p>
          </div>
        </div>
        <Progress value={opportunity.finalScore} className="mt-3 h-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {explanation.headline && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">{explanation.headline}</p>
            {explanation.source === "ai" && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                AI analyzed
              </span>
            )}
          </div>
        )}

        {explanation.reasoning && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {explanation.reasoning}
          </p>
        )}

        {(explanation.skillOverlap?.length || explanation.skillGaps?.length) && (
          <div className="flex flex-wrap gap-4">
            {explanation.skillOverlap && explanation.skillOverlap.length > 0 && (
              <ChipGroup label="Your matching skills" tone="emerald" items={explanation.skillOverlap} />
            )}
            {explanation.skillGaps && explanation.skillGaps.length > 0 && (
              <ChipGroup label="Potential gaps" tone="amber" items={explanation.skillGaps} />
            )}
          </div>
        )}

        {(requirement.summary || requirement.budget || requirement.timeline) && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
            {requirement.summary && (
              <p className="text-muted-foreground leading-relaxed">{requirement.summary}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              {requirement.budget && (
                <span>
                  Budget: <strong className="text-foreground">{requirement.budget}</strong>
                </span>
              )}
              {requirement.timeline && (
                <span>
                  Timeline: <strong className="text-foreground">{requirement.timeline}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {requirement.lineItems && requirement.lineItems.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Requirement details
          </Button>
        )}

        {showDetails && requirement.lineItems && (
          <ul className="space-y-1.5 border-t border-border pt-3">
            {requirement.lineItems.map((item, idx) => (
              <li key={`${item.category}-${idx}`} className="text-sm">
                <span className="font-medium text-foreground">{item.category}:</span>{" "}
                <span className="text-muted-foreground">{item.description}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Response controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {status === "PENDING" ? (
            <>
              <Button
                size="sm"
                onClick={() => respond("ACCEPTED")}
                disabled={pending !== null}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {pending === "ACCEPTED" ? "Accepting…" : "Accept"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => respond("DECLINED")}
                disabled={pending !== null}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {pending === "DECLINED" ? "Declining…" : "Decline"}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  status === "ACCEPTED"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {status === "ACCEPTED" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {status === "ACCEPTED" ? "Accepted" : "Declined"}
              </span>
              {opportunity.respondedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(opportunity.respondedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChipGroup({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "emerald" | "amber";
  items: string[];
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-md px-2 py-0.5 text-xs ${toneClasses}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
