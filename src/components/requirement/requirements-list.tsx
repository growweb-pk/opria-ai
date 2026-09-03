"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileText, Loader2, Users } from "lucide-react";

interface RequirementData {
  summary?: string;
  goals?: Array<{ description: string; source?: string }>;
  requirements?: Array<{ category: string; description: string; priority: string; source?: string }>;
  constraints?: Array<{ type: string; description: string; source?: string }>;
  budget?: { estimated?: string; range?: string; confidence?: number; source?: string };
  timeline?: { estimated?: string; deadline?: string; confidence?: number; source?: string };
  professionalCategories?: Array<{
    name: string;
    description: string;
    requiredSkills: string[];
    priority: string;
  }>;
  missingInformation?: Array<{ field: string; importance: string }>;
}

export interface RequirementItem {
  id: string;
  title: string;
  status: string;
  confidence: number;
  structuredData: RequirementData;
  createdAt: string;
}

export function RequirementsList({ requirements }: { requirements: RequirementItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(requirements);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function approve(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve requirement");
      setItems((prev) => prev.map((r) => (r.id === id ? data.requirement : r)));
      toast({ title: "Requirement approved", description: "Matching professionals for your requirement." });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setApprovingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No requirements yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the AI Advisor to clarify an opportunity and draft a requirement.
            </p>
          </div>
          <Button onClick={() => router.push("/business/opportunities")}>
            Explore Opportunities
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((req) => {
        const data = req.structuredData ?? {};
        return (
          <Card key={req.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{req.title}</CardTitle>
                  <CardDescription>
                    Confidence: {Math.round(req.confidence * 100)}%
                  </CardDescription>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {req.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {data.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
              )}

              {data.goals && data.goals.length > 0 && (
                <Section title="Goals">
                  {data.goals.map((g, i) => (
                    <li key={i}>{g.description}</li>
                  ))}
                </Section>
              )}

              {data.requirements && data.requirements.length > 0 && (
                <Section title="Requirements">
                  {data.requirements.map((r, i) => (
                    <li key={i}>
                      <span className="font-medium">{r.category}:</span> {r.description}{" "}
                      <span className="text-xs text-muted-foreground">({r.priority})</span>
                    </li>
                  ))}
                </Section>
              )}

              {data.constraints && data.constraints.length > 0 && (
                <Section title="Constraints">
                  {data.constraints.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium capitalize">{c.type}:</span> {c.description}
                    </li>
                  ))}
                </Section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Info label="Budget" value={data.budget?.estimated ?? data.budget?.range ?? "Not specified"} />
                <Info label="Timeline" value={data.timeline?.estimated ?? data.timeline?.deadline ?? "Not specified"} />
              </div>

              {data.professionalCategories && data.professionalCategories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Suggested Professional Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {data.professionalCategories.map((cat) => (
                      <span key={cat.name} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {cat.name} — {cat.priority}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.missingInformation && data.missingInformation.length > 0 && (
                <Section title="Missing Information">
                  {data.missingInformation.map((m, i) => (
                    <li key={i}>{m.field} ({m.importance})</li>
                  ))}
                </Section>
              )}

              <div className="flex justify-end">
                {req.status === "DRAFT" ? (
                  <Button onClick={() => approve(req.id)} disabled={approvingId === req.id}>
                    {approvingId === req.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve Requirement
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/business/recommendations")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Recommendations
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">{children}</ul>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
