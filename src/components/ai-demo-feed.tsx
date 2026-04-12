"use client";

import { getAgentSuggestionKindLabel } from "@/lib/agent-suggestions";
import type { AgentReportSuggestion } from "@/lib/types";

type Props = {
  items: AgentReportSuggestion[];
};

function formatConfidence(value: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function getModeLabel(mode: AgentReportSuggestion["synthetic_mode"]) {
  switch (mode) {
    case "ai_draft":
      return "Borrador IA";
    case "external_signal":
      return "Señal externa";
    case "ai_simulated":
    default:
      return "Demo IA";
  }
}

export function AIDemoFeed({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[1.8rem] border border-sky-200 bg-sky-50/80 p-4 shadow-[0_18px_48px_rgba(14,116,144,0.12)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            Actividad demo asistida por IA
          </p>
          <p className="mt-2 text-sm text-sky-950">
            Estas tarjetas no son reportes comunitarios. Son simulaciones o borradores externos
            aprobados por el equipo para onboarding y demostracion.
          </p>
        </div>
        <div className="rounded-2xl border border-sky-300 bg-white/80 px-4 py-2 text-xs text-sky-900">
          Visible solo cuando el admin lo aprueba como demo publica.
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                {getModeLabel(item.synthetic_mode)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                {getAgentSuggestionKindLabel(item.kind)}
              </span>
            </div>

            <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
            {item.summary ? <p className="mt-2 text-sm text-slate-600">{item.summary}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                Confianza {formatConfidence(item.confidence)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                {item.zone || item.city || "Sin zona"}
              </span>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              {new Date(item.created_at).toLocaleString("es-BO")}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AIDemoFeed;
