import { requireAuth } from "@/lib/modules/auth/service";
import { getBusinessProfile } from "@/lib/modules/business/service";
import { getLatestAnalysis } from "@/lib/modules/analysis/service";
import { AnalysisResultsClient } from "@/components/analysis-results";
import type { AnalysisResult } from "@/components/analysis-results";

export default async function BusinessAnalysisPage() {
  const user = await requireAuth(["BUSINESS"]);

  const profile = await getBusinessProfile(user.id);
  let analysis = null;

  if (profile) {
    const raw = await getLatestAnalysis(profile.id);
    if (raw) {
      // Transform to the shape the client component expects
      analysis = {
        id: raw.id,
        healthScores: raw.healthScores as Record<string, number>,
        analysisData: raw.analysisData as Record<string, unknown>,
        provenance: raw.provenance as Record<string, string>,
        confidence: raw.confidence,
        createdAt: raw.createdAt.toISOString(),
      };
    }
  }

  return <AnalysisResultsClient initialAnalysis={analysis as AnalysisResult | null} />;
}
