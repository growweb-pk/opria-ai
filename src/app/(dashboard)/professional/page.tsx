import { requireAuth } from "@/lib/modules/auth/service";
import { getOpportunitiesForProfessional } from "@/lib/modules/professional/service";
import { prisma } from "@/lib/db/client";
import Link from "next/link";
import { Briefcase, CheckCircle2, Clock, XCircle } from "lucide-react";

export default async function ProfessionalOverviewPage() {
  const user = await requireAuth(["PROFESSIONAL"]);

  const profile = await prisma.professionalProfile.findUnique({
    where: { userId: user.id },
  });

  const hasProfile = !!profile;

  // Real opportunity counts derived from persisted MatchResults owned by this
  // professional. No fabricated numbers — an empty profile yields zero matches.
  const opportunities = hasProfile
    ? await getOpportunitiesForProfessional(user.id)
    : [];
  const totalOpportunities = opportunities.length;
  const pendingCount = opportunities.filter(
    (o) => o.responseStatus === "PENDING"
  ).length;
  const acceptedCount = opportunities.filter(
    (o) => o.responseStatus === "ACCEPTED"
  ).length;
  const declinedCount = opportunities.filter(
    (o) => o.responseStatus === "DECLINED"
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {hasProfile ? profile.name : "Professional Dashboard"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {hasProfile
            ? `${profile.title} — Manage your profile and opportunities`
            : "Complete your profile to start receiving opportunities"}
        </p>
      </div>

      {/* Setup Progress */}
      {!hasProfile && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Get Started
          </h2>
          <Link
            href="/professional/profile"
            className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-accent transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">
                Complete your professional profile
              </p>
              <p className="text-sm text-muted-foreground">
                Add your skills, services, and experience
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Profile Summary */}
      {hasProfile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/professional/profile"
            className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
          >
            <p className="text-sm text-muted-foreground">Skills</p>
            <p className="mt-1 text-3xl font-bold text-card-foreground">
              {profile.skills.length}
            </p>
          </Link>
          <Link
            href="/professional/profile"
            className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
          >
            <p className="text-sm text-muted-foreground">Services</p>
            <p className="mt-1 text-3xl font-bold text-card-foreground">
              {profile.services.length}
            </p>
          </Link>
          <Link
            href="/professional/profile"
            className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
          >
            <p className="text-sm text-muted-foreground">Hourly Rate</p>
            <p className="mt-1 text-3xl font-bold text-card-foreground">
              {profile.hourlyRate ? `$${profile.hourlyRate}` : "—"}
            </p>
          </Link>
        </div>
      )}

      {/* Opportunities overview */}
      {hasProfile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              Matched Opportunities
            </h2>
            <Link
              href="/professional/opportunities"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Briefcase className="h-4 w-4" />
              View all
            </Link>
          </div>

          {totalOpportunities === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-muted-foreground">
                No matched opportunities yet. When a business requirement matches your
                skills and services, it will appear here with a full explanation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricCard
                label="Total matches"
                value={totalOpportunities}
                icon={<Briefcase className="h-4 w-4" />}
              />
              <MetricCard
                label="Awaiting response"
                value={pendingCount}
                icon={<Clock className="h-4 w-4" />}
              />
              <MetricCard
                label="Accepted"
                value={acceptedCount}
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="emerald"
              />
              <MetricCard
                label="Declined"
                value={declinedCount}
                icon={<XCircle className="h-4 w-4" />}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div
        className={`flex items-center gap-1.5 text-sm ${
          tone === "emerald" ? "text-emerald-600" : "text-muted-foreground"
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}
