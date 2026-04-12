import { NextRequest, NextResponse } from "next/server";
import {
  isValidAgentWebhookSignature,
  normalizeAgentSuggestionInput,
} from "@/lib/agent-suggestions";
import { getMissingAgentSuggestionsMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-agent-signature");

    if (!isValidAgentWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
    }

    const payload = normalizeAgentSuggestionInput(
      JSON.parse(rawBody) as Record<string, unknown>
    );

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("agent_report_suggestions")
      .insert(payload)
      .select("*")
      .single();

    if (isMissingTableError(error, "agent_report_suggestions")) {
      return NextResponse.json({ error: getMissingAgentSuggestionsMessage() }, { status: 400 });
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "No se pudo guardar la sugerencia." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data.id, ok: true, status: data.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar el webhook." },
      { status: 500 }
    );
  }
}
