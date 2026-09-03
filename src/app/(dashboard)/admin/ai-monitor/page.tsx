import { requireAuth } from "@/lib/modules/auth/service";
import {
  getRecentAnalyses,
  getRecentMatchRequests,
  type AdminAnalysis,
  type AdminMatchRequest,
} from "@/lib/modules/admin/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Link2 } from "lucide-react";

const STATUS_TONE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
};

export default async function AdminAiMonitorPage() {
  await requireAuth(["ADMIN"]);

  const [analyses, matchRequests] = await Promise.all([
    getRecentAnalyses(20),
    getRecentMatchRequests(20),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Monitor</h1>
        <p className="mt-1 text-muted-foreground">
          Recent AI analyses with confidence scores, plus matching processing status.
          Read-only — no new AI calls are executed.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Brain className="h-5 w-5" />
          Recent Analyses ({analyses.length})
        </h2>
        {analyses.length === 0 ? (
          <EmptyCard text="No AI analyses recorded yet." />
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Link2 className="h-5 w-5" />
          Matching Processing Status ({matchRequests.length})
        </h2>
        {matchRequests.length === 0 ? (
          <EmptyCard text="No match requests recorded yet." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Requirement</th>
                      <th className="px-6 py-3 font-medium">Business</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">AI used</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matchRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-6 py-3 text-foreground">
                          {req.requirement.title}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {req.business.companyName}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${
                              STATUS_TONE[req.status] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {aiUsedLabel(req.results)}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {req.createdAt.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: AdminAnalysis }) {
  const confidencePct = Math.round(analysis.confidence * 100);
  const provenance = summarizeProvenance(analysis.provenance);
  const healthCount = countKeys(analysis.healthScores);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {analysis.business.companyName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {analysis.business.industry} ·{" "}
              {analysis.createdAt.toLocaleString()}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-foreground">{confidencePct}%</p>
            <p className="text-xs text-muted-foreground">confidence</p>
          </div>
        </div>
        <Progress value={confidencePct} className="mt-3 h-2" />
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {healthCount > 0 && (
          <p>Health sub-scores recorded: <strong className="text-foreground">{healthCount}</strong></p>
        )}
        {Object.keys(provenance).length > 0 && (
          <p>
            Provenance:{" "}
            {Object.entries(provenance)
              .map(([source, count]) => `${source} ${count}`)
              .join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

// ─── Helpers (persisted JSON → display summaries) ───

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function countKeys(value: unknown): number {
  return Object.keys(asRecord(value)).length;
}

function summarizeProvenance(value: unknown): Record<string, number> {
  const record = asRecord(value);
  const summary: Record<string, number> = {};
  for (const key of Object.keys(record)) {
    const entry = record[key];
    const source =
      typeof entry === "string"
        ? entry
        : typeof asRecord(entry).source === "string"
          ? (asRecord(entry).source as string)
          : null;
    if (source) {
      summary[source] = (summary[source] ?? 0) + 1;
    }
  }
  return summary;
}

function aiUsedLabel(results: unknown): string {
  const meta = asRecord(results);
  if (typeof meta.aiUsed === "boolean") {
    return meta.aiUsed ? "Yes" : "No (deterministic)";
  }
  return meta.method ? String(meta.method) : "—";
}
