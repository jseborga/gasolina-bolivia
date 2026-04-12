"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AISuggestionRow = {
  confidence: number;
  createdAt: string;
  id: number;
  kindLabel: string;
  modeLabel: string;
  provider: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  sourceLabel: string;
  status: "pending_review" | "approved" | "rejected";
  summary: string | null;
  title: string;
  visibility: "admin_only" | "public_demo";
  zoneLabel: string;
};

type Props = {
  rows: AISuggestionRow[];
};

function getStatusClass(status: AISuggestionRow["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "pending_review":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export function AISuggestionReviewTable({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.reviewNotes ?? ""]))
  );
  const [visibilityById, setVisibilityById] = useState<Record<number, "admin_only" | "public_demo">>(
    () => Object.fromEntries(rows.map((row) => [row.id, row.visibility]))
  );

  const submitReview = async (row: AISuggestionRow, action: "approve" | "reject") => {
    setBusyId(row.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-suggestions/${row.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: notesById[row.id]?.trim() || undefined,
          visibility: visibilityById[row.id] ?? "admin_only",
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo revisar la sugerencia.");
      }

      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "No se pudo revisar la sugerencia."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Sugerencia</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Revision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isBusy = busyId === row.id;

              return (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-4 text-slate-600">
                    {new Date(row.createdAt).toLocaleString("es-BO")}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-900">{row.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.kindLabel} | {row.zoneLabel}
                    </div>
                    {row.summary ? <div className="mt-2 text-xs text-slate-600">{row.summary}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <div className="font-medium text-slate-900">{row.sourceLabel}</div>
                    <div>{row.provider}</div>
                    <div>{row.modeLabel}</div>
                    <div className="mt-2">Confianza: {Math.round(row.confidence * 100)}%</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">
                      {row.visibility === "public_demo" ? "Visible en demo publica" : "Solo admin"}
                    </div>
                    {row.reviewedAt ? (
                      <div className="mt-2 text-xs text-slate-500">
                        {new Date(row.reviewedAt).toLocaleString("es-BO")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      <select
                        value={visibilityById[row.id] ?? "admin_only"}
                        onChange={(event) =>
                          setVisibilityById((current) => ({
                            ...current,
                            [row.id]: event.target.value as "admin_only" | "public_demo",
                          }))
                        }
                        className="w-full min-w-[200px] rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                      >
                        <option value="admin_only">Solo admin</option>
                        <option value="public_demo">Publicar como demo</option>
                      </select>

                      <textarea
                        rows={3}
                        value={notesById[row.id] ?? ""}
                        onChange={(event) =>
                          setNotesById((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas internas"
                        className="w-full min-w-[220px] rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => submitReview(row, "approve")}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {isBusy ? "Guardando..." : "Aprobar"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => submitReview(row, "reject")}
                          className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                      </div>

                      {row.reviewedByEmail ? (
                        <div className="text-[11px] text-slate-500">
                          Revisado por {row.reviewedByEmail}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay sugerencias IA registradas todavia.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AISuggestionReviewTable;
