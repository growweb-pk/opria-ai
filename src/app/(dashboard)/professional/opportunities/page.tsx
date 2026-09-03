import { requireAuth } from "@/lib/modules/auth/service";
import {
  getOpportunitiesForProfessional,
  type ProfessionalOpportunity,
} from "@/lib/modules/professional/service";
import {
  OpportunityFeed,
  type Opportunity,
  type ResponseStatus,
} from "@/components/professional/opportunity-feed";

export default async function ProfessionalOpportunitiesPage() {
  const user = await requireAuth(["PROFESSIONAL"]);

  // Ownership is enforced in the service via the authenticated user's profile id.
  const rows = await getOpportunitiesForProfessional(user.id);
  const opportunities: Opportunity[] = rows.map(mapOpportunity);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
        <p className="mt-1 text-muted-foreground">
          Business requirements matched to your skills and services, with explanations.
        </p>
      </div>
      <OpportunityFeed opportunities={opportunities} />
    </div>
  );
}

// ─── Mapping helpers (Prisma JSON → serializable view models) ───

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function mapOpportunity(row: ProfessionalOpportunity): Opportunity {
  const req = row.matchRequest.requirement;
  const data = asRecord(req.structuredData);
  const budget = asRecord(data.budget);
  const timeline = asRecord(data.timeline);
  const lineItemsRaw = Array.isArray(data.requirements) ? data.requirements : [];
  const explanation = asRecord(row.explanation);

  const budgetText =
    typeof budget.estimated === "string"
      ? budget.estimated
      : typeof budget.range === "string"
        ? budget.range
        : undefined;

  const timelineText =
    typeof timeline.estimated === "string"
      ? typeof timeline.deadline === "string"
        ? `${timeline.estimated} (${timeline.deadline})`
        : timeline.estimated
      : undefined;

  return {
    id: row.id,
    finalScore: row.finalScore,
    responseStatus: row.responseStatus as ResponseStatus,
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
    matchStatus: row.matchRequest.status,
    matchedAt: row.createdAt.toISOString(),
    explanation: {
      headline: typeof explanation.headline === "string" ? explanation.headline : undefined,
      reasoning: typeof explanation.reasoning === "string" ? explanation.reasoning : undefined,
      skillOverlap: stringArray(explanation.skillOverlap),
      skillGaps: stringArray(explanation.skillGaps),
      source: typeof explanation.source === "string" ? explanation.source : undefined,
    },
    requirement: {
      id: req.id,
      title: req.title,
      status: req.status,
      confidence: req.confidence,
      summary: typeof data.summary === "string" ? data.summary : undefined,
      budget: budgetText,
      timeline: timelineText,
      lineItems: lineItemsRaw.map(asRecord).slice(0, 12).map((item) => ({
        category: typeof item.category === "string" ? item.category : "Requirement",
        description: typeof item.description === "string" ? item.description : "",
      })),
      business: {
        companyName: req.business.companyName,
        industry: req.business.industry,
        location: req.business.location,
      },
    },
  };
}
