"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  BarChart3,
  Shield,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Eye,
  Sparkles,
} from "lucide-react";
import { AnalysisAnimation } from "@/components/analysis-animation";

// ─── Types ───────────────────────────────────────────────

interface HealthScores {
  overall: number;
  digital: number;
  operational: number;
  financial: number;
  market: number;
  technology: number;
  humanCapital: number;
  customerExperience: number;
  innovation: number;
}

interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface KeyFinding {
  title: string;
  description: string;
  category: string;
  source: "PROVIDED" | "INFERRED" | "RECOMMENDED";
  confidence: number;
}

interface AnalysisData {
  healthScores: HealthScores;
  swot: Swot;
  keyFindings: KeyFinding[];
  overallAssessment: string;
  confidence: number;
}

interface Provenance {
  healthScores: string;
  swot: string;
  overallAssessment: string;
  businessProfile: string;
  assessmentData: string;
}

export interface AnalysisResult {
  id: string;
  healthScores: HealthScores;
  analysisData: AnalysisData;
  provenance: Provenance;
  confidence: number;
  createdAt: string;
}

// ─── Dimension labels ────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  overall: "Overall Health",
  digital: "Digital Presence",
  operational: "Operations",
  financial: "Financial",
  market: "Market Position",
  technology: "Technology",
  humanCapital: "Human Capital",
  customerExperience: "Customer Experience",
  innovation: "Innovation",
};

const DIMENSION_ORDER = [
  "digital",
  "operational",
  "financial",
  "market",
  "technology",
  "humanCapital",
  "customerExperience",
  "innovation",
];

// ─── Component ───────────────────────────────────────────

export function AnalysisResultsClient({
  initialAnalysis,
}: {
  initialAnalysis: AnalysisResult | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialAnalysis);
  const [running, setRunning] = useState(false);

  const handleRunAnalysis = async () => {
    if (running) return;
    setRunning(true);

    try {
      const res = await fetch("/api/analysis", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run analysis");
      }

      // Fetch the full analysis (POST returns a subset)
      const getRes = await fetch("/api/analysis");
      const getData = await getRes.json();

      if (getRes.ok && getData.analysis) {
        setAnalysis(getData.analysis);
      }

      toast({
        title: "Analysis complete",
        description: "Your business health analysis has been generated.",
      });

      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setRunning(false);
    }
  };

  // Analysis running — show animated progress
  if (running) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Business Health Analysis
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI is analyzing your business profile and assessment
          </p>
        </div>
        <AnalysisAnimation />
      </div>
    );
  }

  // No analysis yet — show run button
  if (!analysis) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Business Health Analysis
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-powered analysis of your business profile and assessment
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No analysis yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run AI analysis to generate your business health scores, SWOT
                analysis, and key findings.
              </p>
            </div>
            <Button onClick={handleRunAnalysis} disabled={running} size="lg">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing your business...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analysis exists — show results
  // analysisData may be in AI format (nested swot, healthScores, keyFindings)
  // or seed/demo format (flat strengths, weaknesses, etc.)
  const raw = analysis.analysisData ?? {} as AnalysisData;
  const scores = raw.healthScores ?? (analysis.healthScores as HealthScores);

  // SWOT: support both nested (AI) and flat (seed) formats
  const nestedSwot = raw.swot;
  const flatStrengths = (raw as unknown as Record<string, string[]>).strengths;
  const swot: Swot | undefined = nestedSwot ?? (
    flatStrengths
      ? {
          strengths: flatStrengths,
          weaknesses: (raw as unknown as Record<string, string[]>).weaknesses ?? [],
          opportunities: (raw as unknown as Record<string, string[]>).opportunities ?? [],
          threats: (raw as unknown as Record<string, string[]>).threats ?? [],
        }
      : undefined
  );

  const findings = raw.keyFindings ?? [];
  const overallText = raw.overallAssessment;
  const confidence = typeof (raw as unknown as Record<string, unknown>).confidence === "number"
    ? (raw as unknown as Record<string, number>).confidence
    : analysis.confidence;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Business Health Analysis
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-generated analysis based on your profile and assessment
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRunAnalysis}
          disabled={running}
          size="sm"
        >
          {running ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Re-run Analysis
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Health Score
          </CardTitle>
          <CardDescription>
            AI confidence: {Math.round((confidence ?? 0) * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-5xl font-bold text-primary">
              {scores.overall}
            </div>
            <div className="flex-1">
              <Progress value={scores.overall} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                Scored 0-100 based on AI analysis of your business
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 Health Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Health Dimensions
          </CardTitle>
          <CardDescription>
            8 dimensions of business health, scored by AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSION_ORDER.map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {DIMENSION_LABELS[key] || key}
                </span>
                <span className="text-muted-foreground">
                  {scores[key as keyof HealthScores]}%
                </span>
              </div>
              <Progress
                value={scores[key as keyof HealthScores] as number}
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SWOT Analysis */}
      {swot && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SwotCard
            title="Strengths"
            icon={<Shield className="h-4 w-4 text-green-600" />}
            items={swot.strengths}
            borderColor="border-green-200"
            bgColor="bg-green-50"
          />
          <SwotCard
            title="Weaknesses"
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            items={swot.weaknesses}
            borderColor="border-amber-200"
            bgColor="bg-amber-50"
          />
          <SwotCard
            title="Opportunities"
            icon={<Lightbulb className="h-4 w-4 text-blue-600" />}
            items={swot.opportunities}
            borderColor="border-blue-200"
            bgColor="bg-blue-50"
          />
          <SwotCard
            title="Threats"
            icon={<Eye className="h-4 w-4 text-red-600" />}
            items={swot.threats}
            borderColor="border-red-200"
            bgColor="bg-red-50"
          />
        </div>
      )}

      {/* Overall Assessment */}
      {overallText && (
        <Card>
          <CardHeader>
            <CardTitle>AI Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {overallText}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Findings with Provenance */}
      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Findings</CardTitle>
            <CardDescription>
              Each finding is tagged with its data source
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{finding.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {finding.category}
                    </span>
                    <ProvenanceBadge source={finding.source} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {finding.description}
                </p>
                {finding.source !== "PROVIDED" && (
                  <p className="text-xs text-muted-foreground/70">
                    AI confidence: {Math.round(finding.confidence * 100)}%
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Provenance Notice */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Data sources:</strong>{" "}
            {findings.length > 0
              ? "Key findings are individually tagged with their data source."
              : "Health scores and SWOT analysis are "}
            {findings.length === 0 && (
              <>
                <span className="font-medium">AI-inferred</span> based on your
                business profile and assessment responses (which are{" "}
                <span className="font-medium">directly provided</span> by you).
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function SwotCard({
  title,
  icon,
  items,
  borderColor,
  bgColor,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  borderColor: string;
  bgColor: string;
}) {
  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className={`pb-2 ${bgColor} rounded-t-lg`}>
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-foreground mt-0.5">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ProvenanceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    PROVIDED: "bg-blue-100 text-blue-700",
    INFERRED: "bg-amber-100 text-amber-700",
    RECOMMENDED: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[source] || "bg-muted text-muted-foreground"}`}
    >
      {source}
    </span>
  );
}
