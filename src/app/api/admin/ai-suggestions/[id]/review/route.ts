import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import {
  getMissingAgentSuggestionsMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

type ReviewBody = {
  action?: "approve" | "reject";
  reviewNotes?: string;
  visibility?: "admin_only" | "public_demo";
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const suggestionId = Number(id);
    const body = (await request.json().catch(() => ({}))) as ReviewBody;
    const action = body.action === "reject" ? "reject" : "approve";
    const visibility = body.visibility === "public_demo" ? "public_demo" : "admin_only";

    if (!Number.isFinite(suggestionId) || suggestionId <= 0) {
      return NextResponse.json({ error: "Sugerencia invalida." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("agent_report_suggestions")
      .update({
        review_notes: body.reviewNotes?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by_email: session.email,
        status: action === "approve" ? "approved" : "rejected",
        visibility,
      })
      .eq("id", suggestionId)
      .select("*")
      .single();

    if (isMissingTableError(error, "agent_report_suggestions")) {
      return NextResponse.json({ error: getMissingAgentSuggestionsMessage() }, { status: 400 });
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "No se pudo revisar la sugerencia." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, suggestion: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo revisar la sugerencia.",
      },
      { status: 500 }
    );
  }
}
