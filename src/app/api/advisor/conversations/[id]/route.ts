import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/modules/auth/service";
import { getAdvisorConversation } from "@/lib/modules/advisor/service";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(["BUSINESS"]);
    const conversation = await getAdvisorConversation(user.id, params.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof Error && error.message === "Conversation not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("GET /api/advisor/conversations/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
