"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ContributionRow = {
  contributorCredits: number | null;
  contributorName: string | null;
  contributorRole: string | null;
  createdAt: string;
  id: number;
  ipAddress: string | null;
  pointsAwarded: number;
  pointsSuggested: number;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  riskFlags: string[];
  sourceLabel: string;
  sourceId: number;
  status: "pending" | "approved" | "rejected" | "auto_flagged";
  summary: string;
  visitorId: string | null;
};

type Props = {
  rows: ContributionRow[];
};

function getStatusClass(status: ContributionRow["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "auto_flagged":
      return "bg-amber-100 text-amber-900";
    case "pending":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function ContributionReviewTable({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.reviewNotes ?? ""]))
  );
  const [pointsById, setPointsById] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.id, String(row.pointsAwarded || row.pointsSuggested || 0)])
    )
  );

  const submitReview = async (row: ContributionRow, action: "approve" | "reject") => {
    setBusyId(row.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/contributions/${row.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          pointsAwarded: Number(pointsById[row.id] ?? row.pointsSuggested),
          reviewNotes: notesById[row.id]?.trim() || undefined,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo revisar la contribucion.");
      }

      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "No se pudo revisar la contribucion."
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
              <th className="px-4 py-3">Fuente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Señales</th>
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
                    <div className="font-medium text-slate-900">{row.sourceLabel}</div>
                    <div className="text-xs text-slate-500">ID fuente {row.sourceId}</div>
                    <div className="mt-2 text-xs text-slate-600">{row.summary}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                    {row.reviewedAt ? (
                      <div className="mt-2 text-xs text-slate-500">
                        {new Date(row.reviewedAt).toLocaleString("es-BO")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <div className="font-medium text-slate-900">{row.contributorName || "-"}</div>
                    <div>{row.contributorRole || "Sin rol"}</div>
                    <div>Creditos: {row.contributorCredits ?? 0}</div>
                    <div className="mt-2">{row.visitorId || "-"}</div>
                    <div>{row.ipAddress || "-"}</div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <div>Puntos sugeridos: {row.pointsSuggested}</div>
                    <div>Puntos dados: {row.pointsAwarded}</div>
                    {row.riskFlags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.riskFlags.map((flag) => (
                          <span
                            key={`${row.id}-${flag}`}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2">Sin alertas de riesgo.</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      <textarea
                        rows={3}
                        value={notesById[row.id] ?? ""}
                        onChange={(event) =>
                          setNotesById((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas internas de revision"
                        className="w-full min-w-[220px] rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                      />
                      <input
                        type="number"
                        min="0"
                        value={pointsById[row.id] ?? String(row.pointsSuggested)}
                        onChange={(event) =>
                          setPointsById((current) => ({
                            ...current,
                            [row.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No hay contribuciones registradas todavia.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ContributionReviewTable;
