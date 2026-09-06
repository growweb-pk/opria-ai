"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, Send, Sparkles, User, FileText, Lightbulb } from "lucide-react";

interface Message {
  id: string;
  role: "USER" | "ADVISOR" | "SYSTEM";
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface RequirementSummary {
  id: string;
  title: string;
  status: string;
}

interface AdvisorContext {
  selectedOpportunityId?: string;
  selectedOpportunity?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
  requirementProgress?: number;
  identifiedNeeds?: string[];
  pendingClarifications?: string[];
  suggestedQuestions?: string[];
  readyForRequirement?: boolean;
}

interface Conversation {
  id: string;
  context?: AdvisorContext | null;
  messages: Message[];
  requirement?: RequirementSummary | null;
}

export function AdvisorClient({ opportunityId }: { opportunityId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [message, setMessage] = useState("");

  const context = conversation?.context ?? {};
  const progress = context.requirementProgress ?? 0;
  const readyForRequirement = context.readyForRequirement || progress >= 80;

  useEffect(() => {
    async function loadOrStart() {
      setLoading(true);
      try {
        const listRes = await fetch("/api/advisor/conversations");
        const listData = await listRes.json();
        if (!listRes.ok) throw new Error(listData.error || "Failed to load conversations");

        const all = (listData.conversations ?? []) as Conversation[];
        setConversations(all);

        if (opportunityId) {
          const existing = all.find(
            (c) => c.context?.selectedOpportunityId === opportunityId
          );
          if (existing) {
            setConversation(existing);
            return;
          }

          setStarting(true);
          const createRes = await fetch("/api/advisor/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunityId }),
          });
          const createData = await createRes.json();
          if (!createRes.ok) throw new Error(createData.error || "Failed to start advisor");
          setConversation(createData.conversation);
          setConversations((prev) => [createData.conversation, ...prev]);
          return;
        }

        setConversation(all[0] ?? null);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Advisor unavailable",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      } finally {
        setStarting(false);
        setLoading(false);
      }
    }

    loadOrStart();
  }, [opportunityId, toast]);

  const lastSuggestedQuestions = useMemo(() => {
    const fromContext = context.suggestedQuestions ?? [];
    if (fromContext.length > 0) return fromContext;
    const lastAdvisor = [...(conversation?.messages ?? [])]
      .reverse()
      .find((m) => m.role === "ADVISOR");
    return (lastAdvisor?.metadata?.suggestedQuestions as string[] | undefined) ?? [];
  }, [conversation?.messages, context.suggestedQuestions]);

  async function sendMessage(content = message) {
    if (!conversation || sending || !content.trim()) return;
    setSending(true);
    setMessage("");

    try {
      const res = await fetch(`/api/advisor/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setConversation(data.conversation);
      // setConversation already holds the full updated thread + context, and the
      // advisor page has no other server data — skip a router.refresh() round-trip.
    } catch (err) {
      setMessage(content);
      toast({
        variant: "destructive",
        title: "Message failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  async function generateRequirement() {
    if (!conversation || generating) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate requirement");

      toast({
        title: "Requirement drafted",
        description: "Review and approve it when you're ready.",
      });
      router.push("/business/requirements");
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Requirement generation failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading || starting) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Header />
        <Card>
          <CardContent className="flex items-center justify-center h-72">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {starting ? "Starting advisor conversation..." : "Loading advisor..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Header />
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">Choose an opportunity first</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start from an opportunity so the advisor has the right business context.
              </p>
            </div>
            <Button onClick={() => router.push("/business/opportunities")}>
              Explore Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card className="min-h-[620px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Advisor Conversation
            </CardTitle>
            <CardDescription>
              {context.selectedOpportunity?.title
                ? `Clarifying: ${context.selectedOpportunity.title}`
                : "Clarify your business requirement before matching"}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 max-h-[440px]">
              {conversation.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  {m.role !== "USER" && (
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-card-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "USER" && (
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Advisor is thinking...
                  </div>
                </div>
              )}
            </div>

            {lastSuggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lastSuggestedQuestions.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    disabled={sending}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Answer the advisor's question..."
                className="min-h-[72px]"
                disabled={sending}
              />
              <Button onClick={() => sendMessage()} disabled={sending || !message.trim()} className="self-end">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirement Progress</CardTitle>
              <CardDescription>
                The advisor updates this as the scope becomes clearer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm font-medium">{progress}% clear</p>
              <Button
                className="w-full"
                onClick={generateRequirement}
                disabled={generating || !readyForRequirement}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Draft Requirement
              </Button>
              {!readyForRequirement && (
                <p className="text-xs text-muted-foreground">
                  Keep answering advisor questions until enough context is available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identified Needs</CardTitle>
            </CardHeader>
            <CardContent>
              {(context.identifiedNeeds ?? []).length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(context.identifiedNeeds ?? []).map((need) => (
                    <li key={need} className="flex gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{need}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No needs confirmed yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Still Needed</CardTitle>
            </CardHeader>
            <CardContent>
              {(context.pendingClarifications ?? []).length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(context.pendingClarifications ?? []).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No major gaps identified.</p>
              )}
            </CardContent>
          </Card>

          {conversations.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {conversations.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConversation(c)}
                    className="block w-full rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-accent"
                  >
                    {c.context?.selectedOpportunity?.title ?? "Advisor conversation"}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">AI Advisor</h1>
      <p className="mt-1 text-muted-foreground">
        Clarify a selected opportunity into a structured requirement.
      </p>
    </div>
  );
}
