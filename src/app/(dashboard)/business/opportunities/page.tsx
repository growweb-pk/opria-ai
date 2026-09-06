import { requireAuth } from "@/lib/modules/auth/service";
import { getBusinessProfile } from "@/lib/modules/business/service";
import { getLatestAnalysis } from "@/lib/modules/analysis/service";
import { getOpportunitiesByBusinessId } from "@/lib/modules/opportunity/service";
import { OpportunitiesClient } from "@/components/opportunities-list";
import type { Opportunity } from "@/components/opportunities-list";

export default async function BusinessOpportunitiesPage() {
  const user = await requireAuth(["BUSINESS"]);

  const profile = await getBusinessProfile(user.id);
  let opportunities: Opportunity[] = [];
  let hasAnalysis = false;

  if (profile) {
    // Independent reads — run concurrently to save a serial DB round-trip.
    const [analysis, opps] = await Promise.all([
      getLatestAnalysis(profile.id),
      getOpportunitiesByBusinessId(profile.id),
    ]);
    hasAnalysis = !!analysis;

    opportunities = opps.map((o) => ({
      id: o.id,
      title: o.title,
      category: o.category,
      priority: o.priority,
      confidence: o.confidence,
      details: (o.details ?? {}) as Opportunity["details"],
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  return (
    <OpportunitiesClient
      initialOpportunities={opportunities}
      hasAnalysis={hasAnalysis}
    />
  );
}
