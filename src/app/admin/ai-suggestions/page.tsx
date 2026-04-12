import { requireAdminSession } from "@/lib/admin-auth";
import AISuggestionReviewTable from "@/components/admin/ai-suggestion-review-table";
import AISuggestionSimulatorCard from "@/components/admin/ai-suggestion-simulator-card";
import { getAgentSuggestionKindLabel } from "@/lib/agent-suggestions";
import { getMissingAgentSuggestionsMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AgentReportSuggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

function getModeLabel(mode: AgentReportSuggestion["synthetic_mode"]) {
  switch (mode) {
    case "ai_draft":
      return "Borrador IA";
    case "external_signal":
      return "Señal externa";
    case "ai_simulated":
    default:
      return "Simulado IA";
  }
}

export default async function AdminAISuggestionsPage() {
  await requireAdminSession("/admin/ai-suggestions");

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("agent_report_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (isMissingTableError(error, "agent_report_suggestions")) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {getMissingAgentSuggestionsMessage()}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar sugerencias IA: {error.message}
        </div>
      );
    }

    const suggestions = (data ?? []) as AgentReportSuggestion[];
    const pendingCount = suggestions.filter((item) => item.status === "pending_review").length;
    const publicCount = suggestions.filter(
      (item) => item.status === "approved" && item.visibility === "public_demo"
    ).length;
    const rows = suggestions.map((item) => ({
      confidence: item.confidence ?? 0,
      createdAt: item.created_at,
      id: item.id,
      kindLabel: getAgentSuggestionKindLabel(item.kind),
      modeLabel: getModeLabel(item.synthetic_mode),
      provider: item.provider,
      reviewNotes: item.review_notes ?? null,
      reviewedAt: item.reviewed_at ?? null,
      reviewedByEmail: item.reviewed_by_email ?? null,
      sourceLabel: item.source_label,
      status: item.status,
      summary: item.summary ?? null,
      title: item.title,
      visibility: item.visibility,
      zoneLabel: [item.zone, item.city].filter(Boolean).join(" | ") || "Sin zona",
    }));

    return (
      <div className="space-y-6">
        <AISuggestionSimulatorCard />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sugerencias</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{suggestions.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Demo publica</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{publicCount}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h1 className="text-lg font-semibold text-slate-900">Sugerencias de agentes IA</h1>
            <p className="text-sm text-slate-500">
              Recibe señales desde webhooks externos y decide si quedan solo para operaciones o si
              se publican como demo asistida por IA.
            </p>
          </div>
          <div className="p-5">
            <AISuggestionReviewTable rows={rows} />
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar sugerencias IA: {error instanceof Error ? error.message : "Error inesperado"}
      </div>
    );
  }
}
