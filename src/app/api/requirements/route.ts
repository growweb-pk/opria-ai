import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/modules/auth/service";
import {
  generateRequirementForConversation,
  listRequirementsForBusinessUser,
} from "@/lib/modules/requirement/service";
import { generateRequirementSchema } from "@/lib/modules/requirement/schemas";
import { AIProviderError, AIValidationError, AIRateLimitError } from "@/lib/modules/ai/types";

export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const requirements = await listRequirementsForBusinessUser(user.id);
    return NextResponse.json({ requirements });
  } catch (error) {
    console.error("GET /api/requirements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const body = generateRequirementSchema.parse(await request.json());
    const requirement = await generateRequirementForConversation(user.id, body.conversationId);
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Business profile not found" || error.message === "Conversation not found")
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
      console.error("POST /api/requirements AI error:", error.message);
      return NextResponse.json(
        { error: "Requirement generation failed. Please try again." },
        { status: 502 }
      );
    }

    console.error("POST /api/requirements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
