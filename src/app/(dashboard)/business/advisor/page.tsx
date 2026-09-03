import { requireAuth } from "@/lib/modules/auth/service";
import { AdvisorClient } from "@/components/advisor/advisor-client";

export default async function BusinessAdvisorPage({
  searchParams,
}: {
  searchParams: { opportunityId?: string };
}) {
  await requireAuth(["BUSINESS"]);

  return <AdvisorClient opportunityId={searchParams.opportunityId} />;
}
