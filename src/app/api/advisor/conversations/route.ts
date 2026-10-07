import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  createAdvisorConversation,
  listAdvisorConversations,
} from "@/lib/modules/advisor/service";
import { createAdvisorConversationSchema } from "@/lib/modules/advisor/schemas";
import { AIProviderError, AIValidationError, AIRateLimitError } from "@/lib/modules/ai/types";

export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const conversations = await listAdvisorConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET /api/advisor/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const body = createAdvisorConversationSchema.parse(await request.json());
    const conversation = await createAdvisorConversation(user.id, body.opportunityId);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Business profile not found" || error.message === "Opportunity not found")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please try again shortly." },
        { status: 429 }
      );
    }

    if (error instanceof AIValidationError || error instanceof AIProviderError) {
      console.error("POST /api/advisor/conversations AI error:", error.message);
      return NextResponse.json(
        { error: "Advisor could not start the conversation. Please try again." },
        { status: 502 }
      );
    }

    console.error("POST /api/advisor/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
