import { requireAuth } from "@/lib/modules/auth/service";
import { prisma } from "@/lib/db/client";
import { getDemoJourney } from "@/lib/modules/demo/service";
import { DemoJourney } from "@/components/demo/demo-journey";
import Link from "next/link";

export default async function BusinessOverviewPage() {
  const user = await requireAuth(["BUSINESS"]);

  // The business profile and the demo-journey status are independent reads
  // (both keyed on user.id) — fetch them concurrently instead of serially.
  const [business, journey] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { userId: user.id },
      include: {
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        opportunities: { where: { status: "IDENTIFIED" } },
      },
    }),
    getDemoJourney(user.id),
  ]);

  const hasProfile = !!business;
  const hasAssessment = business?.assessments.length
    ? business.assessments[0].status === "COMPLETED"
    : false;
  const hasAnalysis = business?.analyses.length ? true : false;
  const hasOpportunities = (business?.opportunities.length ?? 0) > 0;

  const healthScore = (() => {
    const hs = business?.analyses[0]?.healthScores as Record<string, number> | null;
    return hs?.overall ?? null;
  })();

  // recommendationsCount depends on business.id, so it runs after the parallel
  // fetch above. (The demo journey was already loaded in that Promise.all.)
  const recommendationsCount = business
    ? await prisma.matchResult.count({
        where: { matchRequest: { businessId: business.id } },
      })
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {hasProfile ? business.companyName : "Welcome to Opria"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {hasProfile
            ? "Your business growth dashboard"
            : "Complete your profile to get started"}
        </p>
      </div>

      {/* Demo Journey — fast forward (Phase 7) */}
      {journey && (
        <DemoJourney
          journey={journey}
          demoModeEnabled={process.env.DEMO_MODE_ENABLED === "true"}
        />
      )}

      {/* Setup Progress */}
      {!hasProfile || !hasAssessment || !hasAnalysis ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Get Started
          </h2>
          <div className="space-y-3">
            <StepItem
              number={1}
              title="Complete your business profile"
              description="Tell us about your company, goals, and challenges"
              href="/business/profile"
              completed={hasProfile}
            />
            <StepItem
              number={2}
              title="Take the AI Growth Assessment"
              description="Answer questions to help AI understand your business"
              href="/business/assessment"
              completed={hasAssessment}
            />
            <StepItem
              number={3}
              title="View your AI Health Analysis"
              description="See your business health scores and SWOT analysis"
              href="/business/analysis"
              completed={hasAnalysis}
            />
            <StepItem
              number={4}
              title="Discover growth opportunities"
              description="Let AI identify tailored growth opportunities for your business"
              href="/business/opportunities"
              completed={hasOpportunities}
            />
          </div>
        </div>
      ) : null}

      {/* Quick Stats */}
      {hasAnalysis && business && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Health Score"
            value={healthScore != null ? `${healthScore}` : "—"}
            href="/business/analysis"
          />
          <StatCard
            title="Opportunities Found"
            value={
              hasOpportunities
                ? business.opportunities.length.toString()
                : "0"
            }
            href="/business/opportunities"
          />
          <StatCard
            title="Recommendations"
            value={recommendationsCount.toString()}
            href="/business/recommendations"
          />
        </div>
      )}

      {/* What This Means — shown when analysis exists */}
      {hasAnalysis && business && healthScore != null && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-card-foreground">
            What This Means
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your overall health score of <strong>{healthScore}/100</strong> reflects
            AI analysis of your business profile and assessment responses across
            8 dimensions — including digital presence, operations, technology
            adoption, and more. Scores below 50 indicate significant growth
            potential, while scores above 70 show strong maturity.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each dimension score identifies specific areas for improvement.
            The AI has also identified{" "}
            <strong>
              {business.opportunities.length} growth opportunity
              {business.opportunities.length !== 1 ? "ies" : "y"}
            </strong>{" "}
            tailored to your business.
          </p>
          <div className="flex gap-3 pt-2">
            <Link
              href="/business/opportunities"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Explore Opportunities
            </Link>
            <Link
              href="/business/analysis"
              className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              View Full Analysis
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

function StepItem({
  number,
  title,
  description,
  href,
  completed,
}: {
  number: number;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}) {
  return (
    <Link
      href={completed ? href : href}
      className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-accent transition-colors"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          completed
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-bold text-card-foreground">{value}</p>
    </Link>
  );
}
