"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TrafficIncidentRow = {
  confirmationCount: number;
  createdAt: string;
  description: string | null;
  durationMinutes: number;
  id: number;
  pointLabel: string;
  rejectionCount: number;
  status: "active" | "resolved" | "expired";
  typeLabel: string;
};

type Props = {
  rows: TrafficIncidentRow[];
};

function getStatusClass(status: TrafficIncidentRow["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "resolved":
      return "bg-sky-100 text-sky-700";
    case "expired":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function TrafficIncidentReviewTable({ rows }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveIncident = async (incidentId: number) => {
    setBusyId(incidentId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/traffic-incidents/${incidentId}/resolve`, {
        method: "POST",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo cerrar el incidente.");
      }

      router.refresh();
    } catch (resolveError) {
      setError(
        resolveError instanceof Error ? resolveError.message : "No se pudo cerrar el incidente."
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Duracion</th>
              <th className="px-4 py-3">Confirmaciones</th>
              <th className="px-4 py-3">Rechazos</th>
              <th className="px-4 py-3">Punto</th>
              <th className="px-4 py-3">Accion</th>
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
                  <td className="px-4 py-4 text-slate-700">{row.typeLabel}</td>
                  <td className="px-4 py-4 text-slate-600">{row.description || "-"}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{row.durationMinutes} min</td>
                  <td className="px-4 py-4 text-slate-600">{row.confirmationCount}</td>
                  <td className="px-4 py-4 text-slate-600">{row.rejectionCount}</td>
                  <td className="px-4 py-4 text-slate-600">{row.pointLabel}</td>
                  <td className="px-4 py-4">
                    {row.status === "active" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => resolveIncident(row.id)}
                        className="rounded-xl border border-sky-300 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                      >
                        {isBusy ? "Cerrando..." : "Cerrar incidente"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Sin accion</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Aun no hay incidentes viales registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TrafficIncidentReviewTable;
