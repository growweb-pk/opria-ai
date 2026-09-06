"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Users,
  BadgeCheck,
  Clock,
  DollarSign,
  Star,
} from "lucide-react";

// ─── Serializable view models (mapped from Prisma in the server page) ───

export interface RecommendationProfessional {
  id: string;
  name: string;
  title: string;
  skills: string[];
  services: string[];
  certifications: string[];
  industryExpertise: string[];
  bio: string | null;
  hourlyRate: number | null;
  projectMinBudget: number | null;
  projectMaxBudget: number | null;
  reputation: number;
  availability: string;
  verification: string;
}

interface ScoreFactor {
  key: string;
  label: string;
  weight: number;
  normalized: number;
  score: number;
}

export interface RecommendationMatch {
  id: string;
  rank: number;
  structuredScore: number;
  aiScore: number;
  finalScore: number;
  scoreBreakdown: {
    factors?: ScoreFactor[];
    structuredScore?: number;
    aiScore?: number;
    finalScore?: number;
    weights?: { structured?: number; ai?: number };
    [flatKey: string]: unknown;
  };
  explanation: {
    headline?: string;
    reasoning?: string;
    skillOverlap?: string[];
    skillGaps?: string[];
    strengths?: string[];
    weaknesses?: string[];
    confidence?: number | null;
    source?: string;
  };
  professional: RecommendationProfessional;
}

export interface RecommendationGroup {
  requirementId: string;
  requirementTitle: string;
  requirementStatus: string;
  matchStatus: string | null;
  totalCandidates: number | null;
  results: RecommendationMatch[];
}

// Human-readable labels for the flat (seed-compatible) breakdown keys.
const FLAT_LABELS: Record<string, string> = {
  skillMatch: "Skill Match",
  industryFit: "Industry Experience",
  reputationScore: "Reputation",
  portfolioQuality: "Portfolio Quality",
  availabilityFit: "Availability",
  budgetFit: "Budget Fit",
  verificationFit: "Verification Status",
};

const FLAT_KEY_ORDER = [
  "skillMatch",
  "industryFit",
  "reputationScore",
  "portfolioQuality",
  "availabilityFit",
  "budgetFit",
  "verificationFit",
];

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-muted-foreground";
}

export function RecommendationsList({ groups }: { groups: RecommendationGroup[] }) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Approve a requirement and the matching engine will rank professionals for you.
            </p>
          </div>
          <Button asChild>
            <Link href="/business/requirements">Go to Requirements</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.requirementId} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {group.requirementTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                Requirement status: {group.requirementStatus}
                {group.totalCandidates != null &&
                  ` · ${group.totalCandidates} eligible candidate${group.totalCandidates === 1 ? "" : "s"} evaluated`}
              </p>
            </div>
          </div>

          {group.results.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {group.matchStatus === "COMPLETED"
                  ? "Matching completed but no eligible professionals were found for this requirement."
                  : "Matching has not completed yet for this requirement."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {group.results.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: RecommendationMatch }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { professional, explanation, scoreBreakdown } = match;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {match.rank === 1 ? (
                <Award className="h-5 w-5" />
              ) : (
                <span className="text-sm font-bold">#{match.rank}</span>
              )}
            </div>
            <div>
              <CardTitle className="text-base">{professional.name}</CardTitle>
              <CardDescription>{professional.title}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${scoreColor(match.finalScore)}`}>
              {Math.round(match.finalScore)}
            </p>
            <p className="text-xs text-muted-foreground">match score</p>
          </div>
        </div>
        <Progress value={match.finalScore} className="mt-3 h-2" />
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
              <ChipGroup label="Matches" tone="emerald" items={explanation.skillOverlap} />
            )}
            {explanation.skillGaps && explanation.skillGaps.length > 0 && (
              <ChipGroup label="Gaps" tone="amber" items={explanation.skillGaps} />
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBreakdown((v) => !v)}
          >
            {showBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Score breakdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfile((v) => !v)}
          >
            <User className="h-4 w-4" />
            {showProfile ? "Hide profile" : "View profile"}
          </Button>
        </div>

        {showBreakdown && <ScoreBreakdown breakdown={scoreBreakdown} match={match} />}
        {showProfile && <ProfessionalProfile professional={professional} />}
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
          <span
            key={item}
            className={`rounded-md px-2 py-0.5 text-xs ${toneClasses}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreBreakdown({
  breakdown,
  match,
}: {
  breakdown: RecommendationMatch["scoreBreakdown"];
  match: RecommendationMatch;
}) {
  const weights = breakdown.weights;
  const factors = breakdown.factors;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Structured: <strong className="text-foreground">{Math.round(match.structuredScore)}</strong>
          {weights?.structured != null && ` × ${Math.round(weights.structured * 100)}%`}
        </span>
        <span>
          AI semantic: <strong className="text-foreground">{Math.round(match.aiScore)}</strong>
          {weights?.ai != null && ` × ${Math.round(weights.ai * 100)}%`}
        </span>
        <span>
          Final: <strong className="text-foreground">{Math.round(match.finalScore)}</strong>
        </span>
      </div>

      {factors && factors.length > 0 ? (
        <div className="space-y-2">
          {factors.map((factor) => (
            <div key={factor.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  {factor.label}{" "}
                  <span className="text-muted-foreground">
                    ({Math.round(factor.weight * 100)}%)
                  </span>
                </span>
                <span className="font-medium text-muted-foreground">
                  {Math.round(factor.score)}
                </span>
              </div>
              <Progress value={factor.score} className="h-1.5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {FLAT_KEY_ORDER.filter((key) => typeof breakdown[key] === "number").map(
            (key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{FLAT_LABELS[key] ?? key}</span>
                  <span className="font-medium text-muted-foreground">
                    {Math.round(breakdown[key] as number)}
                  </span>
                </div>
                <Progress value={breakdown[key] as number} className="h-1.5" />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ProfessionalProfile({
  professional,
}: {
  professional: RecommendationProfessional;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <ProfileStat
          icon={<Star className="h-4 w-4" />}
          label="Reputation"
          value={`${professional.reputation.toFixed(1)} / 5`}
        />
        <ProfileStat
          icon={<Clock className="h-4 w-4" />}
          label="Availability"
          value={professional.availability}
        />
        <ProfileStat
          icon={<BadgeCheck className="h-4 w-4" />}
          label="Verification"
          value={professional.verification}
        />
        <ProfileStat
          icon={<DollarSign className="h-4 w-4" />}
          label="Hourly rate"
          value={professional.hourlyRate ? `$${professional.hourlyRate}` : "Not set"}
        />
      </div>

      {professional.projectMinBudget != null && professional.projectMaxBudget != null && (
        <p className="text-sm text-muted-foreground">
          Project budget range:{" "}
          <span className="font-medium text-foreground">
            ${professional.projectMinBudget.toLocaleString()} – $
            {professional.projectMaxBudget.toLocaleString()}
          </span>
        </p>
      )}

      {professional.bio && (
        <p className="text-sm text-muted-foreground leading-relaxed">{professional.bio}</p>
      )}

      <ProfileChips label="Skills" items={professional.skills} />
      <ProfileChips label="Services" items={professional.services} />
      <ProfileChips label="Certifications" items={professional.certifications} />
      <ProfileChips label="Industry expertise" items={professional.industryExpertise} />
    </div>
  );
}

function ProfileStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}

function ProfileChips({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
