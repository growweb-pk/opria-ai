import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getAssessmentQuestions } from "@/lib/modules/assessment/service";

/**
 * GET /api/assessment/questions
 * Returns the assessment question bank.
 * Requires BUSINESS role.
 */
export async function GET() {
  try {
    await requireAuth(["BUSINESS"]);

    const questions = getAssessmentQuestions();

    // Return questions without exposing internal scoring
    const sanitized = questions.map((q) => ({
      id: q.id,
      category: q.category,
      text: q.text,
      options: q.options.map((o) => ({ label: o.label })),
    }));

    return NextResponse.json({ questions: sanitized });
  } catch (error) {
    console.error("GET /api/assessment/questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
