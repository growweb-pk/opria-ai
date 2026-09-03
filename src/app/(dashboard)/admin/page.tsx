import Link from "next/link";
import { requireAuth } from "@/lib/modules/auth/service";
import { getAdminAnalytics } from "@/lib/modules/admin/service";
import {
  BarChart3,
  Brain,
  Building2,
  ClipboardCheck,
  Link2,
  Users,
  UserCheck,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await requireAuth(["ADMIN"]);
  const metrics = await getAdminAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Platform overview and management
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total users" value={metrics.totalUsers} icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Businesses" value={metrics.businessUsers} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard label="Professionals" value={metrics.professionalUsers} icon={<UserCheck className="h-4 w-4" />} />
        <MetricCard label="Admins" value={metrics.adminUsers} icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Assessments completed" value={metrics.assessmentsCompleted} icon={<ClipboardCheck className="h-4 w-4" />} />
        <MetricCard label="AI analyses" value={metrics.analyses} icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Match requests" value={metrics.matchRequests} icon={<Brain className="h-4 w-4" />} />
        <MetricCard label="Match results" value={metrics.matchResults} icon={<Link2 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">User Management</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            View roles and statuses, suspend or reactivate accounts.
          </p>
        </Link>
        <Link
          href="/admin/ai-monitor"
          className="rounded-xl border border-border bg-card p-6 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-foreground">
            <Brain className="h-5 w-5" />
            <h2 className="text-lg font-semibold">AI Monitor</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent AI analyses, confidence scores, and matching processing status.
          </p>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}
