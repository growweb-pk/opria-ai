"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  Save,
} from "lucide-react";

const DRAFT_KEY = "opria-assessment-draft";

interface QuestionOption {
  label: string;
}

interface Question {
  id: string;
  category: string;
  text: string;
  options: QuestionOption[];
}

interface Answer {
  questionId: string;
  category: string;
  question: string;
  answer: string;
}

interface CategoryScore {
  score: number;
  maxScore: number;
  percentage: number;
}

export default function AssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Record<string, CategoryScore>>({});
  const [overallScore, setOverallScore] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/assessment/questions");
        if (!res.ok) throw new Error("Failed to load questions");
        const data = await res.json();
        setQuestions(data.questions);

        // Check for saved draft
        try {
          const saved = localStorage.getItem(DRAFT_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as Record<string, string>;
            if (Object.keys(parsed).length > 0) {
              setAnswers(parsed);
              setShowDraftPrompt(true);
            }
          }
        } catch {
          // Ignore parse errors
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load assessment questions.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [toast]);

  // Auto-save answers to localStorage whenever they change
  useEffect(() => {
    if (!draftRestored && !loading && Object.keys(answers).length > 0) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
      } catch {
        // Ignore storage errors
      }
    }
  }, [answers, draftRestored, loading]);

  const currentQuestion = questions[currentIndex] || null;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFirstQuestion = currentIndex === 0;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const selectAnswer = useCallback(
    (question: Question, optionLabel: string) => {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: optionLabel,
      }));
    },
    []
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore
    }
    setShowDraftPrompt(false);
    setDraftRestored(true);
  }, []);

  const keepDraft = useCallback(() => {
    setShowDraftPrompt(false);
    setDraftRestored(true);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, totalQuestions]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleSubmit = async () => {
    if (submitting) return;

    // Validate all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete assessment",
        description: `Please answer all questions. ${unanswered.length} remaining.`,
      });
      // Jump to first unanswered
      const firstUnanswered = questions.findIndex((q) => !answers[q.id]);
      if (firstUnanswered >= 0) setCurrentIndex(firstUnanswered);
      return;
    }

    setSubmitting(true);

    try {
      // Build responses — score is NOT included; the server derives it
      const responses: Answer[] = questions.map((q) => ({
        questionId: q.id,
        category: q.category,
        question: q.text,
        answer: answers[q.id],
      }));

      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit assessment");
      }

      const data = await res.json();

      // Use server-computed scores (client never handles canonical scores)
      const categoryScores = data.categoryScores as Record<
        string,
        CategoryScore
      >;
      const overall = data.overallScore as number;

      setScores(categoryScores);
      setOverallScore(overall);
      setSubmitted(true);

      // Clear the saved draft on successful submission
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore
      }

      toast({
        title: "Assessment complete!",
        description: "Your business growth assessment has been submitted.",
      });

      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No assessment questions available. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results view after submission
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Assessment Results
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your business growth assessment is complete
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Score: {overallScore}%
            </CardTitle>
            <CardDescription>
              Based on your responses across {Object.keys(scores).length}{" "}
              categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(scores).map(([category, data]) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{category}</span>
                  <span className="text-muted-foreground">
                    {data.percentage}%
                  </span>
                </div>
                <Progress value={data.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              In the next phase, AI analysis will provide detailed insights and
              actionable recommendations based on your assessment results.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={() => router.push("/business")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Assessment questionnaire view
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Draft resume prompt */}
      {showDraftPrompt && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Save className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Draft assessment found
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {answeredCount} saved answer{answeredCount !== 1 ? "s" : ""}. Would you like to continue where you left off?
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearDraft}>
                Start Fresh
              </Button>
              <Button size="sm" onClick={keepDraft}>
                Resume
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Business Growth Assessment
        </h1>
        <p className="mt-1 text-muted-foreground">
          Answer {totalQuestions} questions across 8 categories to assess your
          business readiness
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-muted-foreground">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Category badge */}
      {currentQuestion && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {currentQuestion.category}
          </span>
        </div>
      )}

      {/* Question Card */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <ClipboardList className="h-5 w-5 inline-block mr-2 text-primary" />
              {currentQuestion.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = currentAnswer === option.label;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectAnswer(currentQuestion, option.label)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirstQuestion}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < totalQuestions}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Assessment
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!currentAnswer}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
