import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  getAdvisorConversation,
  sendAdvisorMessage,
} from "@/lib/modules/advisor/service";
import { sendAdvisorMessageSchema } from "@/lib/modules/advisor/schemas";
import { AIProviderError, AIValidationError, AIRateLimitError } from "@/lib/modules/ai/types";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const conversation = await getAdvisorConversation(user.id, params.id);
    return NextResponse.json({ messages: conversation.messages });
  } catch (error) {
    if (error instanceof Error && error.message === "Conversation not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("GET /api/advisor/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const body = sendAdvisorMessageSchema.parse(await request.json());
    const result = await sendAdvisorMessage(user.id, params.id, body.content);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Conversation not found" ||
        error.message === "Opportunity not found" ||
        error.message === "Business profile not found")
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
      console.error("POST /api/advisor/conversations/[id]/messages AI error:", error.message);
      return NextResponse.json(
        { error: "Advisor response failed. Please try again." },
        { status: 502 }
      );
    }

    console.error("POST /api/advisor/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
