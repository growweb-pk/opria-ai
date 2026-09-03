import { requireAuth } from "@/lib/modules/auth/service";
import { getRecommendationsForBusinessUser } from "@/lib/modules/matching/service";
import {
  RecommendationsList,
  type RecommendationGroup,
  type RecommendationMatch,
} from "@/components/recommendations/recommendations-list";

export default async function BusinessRecommendationsPage() {
  const user = await requireAuth(["BUSINESS"]);
  const requirements = await getRecommendationsForBusinessUser(user.id);

  const groups: RecommendationGroup[] = requirements.map((req) => {
    const matchRequest = req.matchRequests[0];
    const requestMeta = (matchRequest?.results ?? {}) as {
      totalCandidates?: number;
    };

    const results: RecommendationMatch[] = (matchRequest?.matchResults ?? []).map(
      (r) => ({
        id: r.id,
        rank: r.rank,
        structuredScore: r.structuredScore,
        aiScore: r.aiScore,
        finalScore: r.finalScore,
        scoreBreakdown: (r.scoreBreakdown ?? {}) as RecommendationMatch["scoreBreakdown"],
        explanation: (r.explanation ?? {}) as RecommendationMatch["explanation"],
        professional: {
          id: r.professional.id,
          name: r.professional.name,
          title: r.professional.title,
          skills: r.professional.skills,
          services: r.professional.services,
          certifications: r.professional.certifications,
          industryExpertise: r.professional.industryExpertise,
          bio: r.professional.bio,
          hourlyRate: r.professional.hourlyRate,
          projectMinBudget: r.professional.projectMinBudget,
          projectMaxBudget: r.professional.projectMaxBudget,
          reputation: r.professional.reputation,
          availability: r.professional.availability,
          verification: r.professional.verification,
        },
      })
    );

    return {
      requirementId: req.id,
      requirementTitle: req.title,
      requirementStatus: req.status,
      matchStatus: matchRequest?.status ?? null,
      totalCandidates: requestMeta.totalCandidates ?? null,
      results,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recommendations</h1>
        <p className="mt-1 text-muted-foreground">
          Ranked professionals matched to your approved requirements, with full
          score traceability.
        </p>
      </div>
      <RecommendationsList groups={groups} />
    </div>
  );
}
