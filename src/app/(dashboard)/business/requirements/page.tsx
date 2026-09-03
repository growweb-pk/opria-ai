import { requireAuth } from "@/lib/modules/auth/service";
import { listRequirementsForBusinessUser } from "@/lib/modules/requirement/service";
import { RequirementsList, type RequirementItem } from "@/components/requirement/requirements-list";

export default async function BusinessRequirementsPage() {
  const user = await requireAuth(["BUSINESS"]);
  const requirements = await listRequirementsForBusinessUser(user.id);

  const mapped: RequirementItem[] = requirements.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    confidence: r.confidence,
    structuredData: r.structuredData as RequirementItem["structuredData"],
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Requirements</h1>
        <p className="mt-1 text-muted-foreground">
          Review structured requirements generated from advisor conversations.
        </p>
      </div>
      <RequirementsList requirements={mapped} />
    </div>
  );
}
