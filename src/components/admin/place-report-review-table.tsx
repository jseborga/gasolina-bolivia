"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlaceReportReviewRow = {
  contributionId: number | null;
  contributorCredits: number | null;
  contributorName: string | null;
  contributorRole: string | null;
  createdAt: string;
  id: number;
  ipAddress: string | null;
  notes: string | null;
  pointsSuggested: number | null;
  reasonLabel: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  riskFlags: string[];
  status: "pending" | "approved" | "rejected";
  targetId: number;
  targetLabel: string;
  targetTypeLabel: string;
  visitorId: string | null;
};

type Props = {
  rows: PlaceReportReviewRow[];
};

function getStatusClass(status: PlaceReportReviewRow["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "pending":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export function PlaceReportReviewTable({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.reviewNotes ?? ""]))
  );
  const [pointsById, setPointsById] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.id, row.pointsSuggested != null ? String(row.pointsSuggested) : "0"])
    )
  );

  const submitReview = async (row: PlaceReportReviewRow, action: "approve" | "reject") => {
    setBusyId(row.id);
    setError(null);

    try {
      const pointsValue = Number(pointsById[row.id] ?? row.pointsSuggested ?? 0);
      const response = await fetch(`/api/admin/place-reports/${row.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          pointsAwarded: row.contributionId != null ? pointsValue : undefined,
          reviewNotes: notesById[row.id]?.trim() || undefined,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo revisar la denuncia.");
      }

      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "No se pudo revisar la denuncia."
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
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Lugar</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Colaborador</th>
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
                  <td className="px-4 py-4 text-slate-700">
                    <div className="font-medium text-slate-900">{row.targetLabel}</div>
                    <div className="text-xs text-slate-500">
                      {row.targetTypeLabel} | ID {row.targetId}
                    </div>
                    {row.notes ? <div className="mt-2 text-xs text-slate-600">{row.notes}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{row.reasonLabel}</td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <div>{row.visitorId || "-"}</div>
                    <div>{row.ipAddress || "-"}</div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    {row.contributorName ? (
                      <>
                        <div className="font-medium text-slate-900">{row.contributorName}</div>
                        <div>{row.contributorRole || "Colaborador"}</div>
                        <div>Creditos actuales: {row.contributorCredits ?? 0}</div>
                        <div className="mt-2">Puntos sugeridos: {row.pointsSuggested ?? 0}</div>
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
                        ) : null}
                      </>
                    ) : (
                      <div>Anonimo o sin token.</div>
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

                      {row.contributorName ? (
                        <input
                          type="number"
                          min="0"
                          value={pointsById[row.id] ?? "0"}
                          onChange={(event) =>
                            setPointsById((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-500"
                        />
                      ) : null}

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
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Aun no hay denuncias registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlaceReportReviewTable;
