"use client";

import Link from "next/link";
import { useState } from "react";
import type { StationImportAuditResponse } from "@/lib/admin-types";

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(2)} km`;
}

function formatDelta(delta?: number | null) {
  if (delta == null) return "-";
  return delta > 0 ? `+${delta.toFixed(6)}` : delta.toFixed(6);
}

export function ImportAudit() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<StationImportAuditResponse | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stations/import-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      const json = (await res.json()) as StationImportAuditResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo auditar importadas.");
      }

      setAudit(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo auditar importadas.");
      setAudit(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-slate-900">Auditar importadas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Revisa las estaciones importadas desde Google Maps. El sistema compara
              direccion vs punto y estima si hay un desplazamiento sistematico.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span>Limite</span>
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </label>

            <button
              type="button"
              onClick={runAudit}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Auditando..." : "Auditar importadas"}
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      {audit ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Importadas detectadas</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{audit.importedCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Auditadas ahora</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{audit.items.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Con alerta</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">
                {audit.items.filter((item) => item.verification.status === "warning").length}
              </p>
            </div>
          </section>

          {audit.offsetSuggestion ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Offset sugerido</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    audit.offsetSuggestion.confidence === "high"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {audit.offsetSuggestion.confidence === "high" ? "Alta confianza" : "Baja confianza"}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Si varias estaciones muestran el mismo desplazamiento, podria haber
                un offset sistematico. Este es el corrimiento mediano estimado con{" "}
                {audit.offsetSuggestion.sampleCount} muestras.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Delta lat</p>
                  <p className="mt-2">{formatDelta(audit.offsetSuggestion.latitudeDelta)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Delta lng</p>
                  <p className="mt-2">{formatDelta(audit.offsetSuggestion.longitudeDelta)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Residuo promedio</p>
                  <p className="mt-2">{formatDistance(audit.offsetSuggestion.residualKm)}</p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="space-y-4">
            {audit.items.map((item) => (
              <section
                key={item.station.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3 xl:max-w-3xl">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{item.station.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {[item.station.address, item.station.zone, item.station.city].filter(Boolean).join(" | ") || "Sin direccion"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Punto actual: {item.station.latitude != null && item.station.longitude != null
                          ? `${item.station.latitude.toFixed(6)}, ${item.station.longitude.toFixed(6)}`
                          : "sin coordenadas"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${
                          item.verification.status === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.verification.status === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.verification.status === "ok"
                          ? "Coherente"
                          : item.verification.status === "warning"
                            ? "Revisar"
                            : "Parcial"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        Distancia {formatDistance(item.verification.distanceKm)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        Delta lat {formatDelta(item.latitudeDelta)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        Delta lng {formatDelta(item.longitudeDelta)}
                      </span>
                    </div>

                    {item.verification.issues.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {item.verification.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-700">
                        Sin diferencias importantes entre direccion y punto.
                      </p>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">Direccion geocodificada</p>
                        <p className="mt-2">
                          {item.verification.addressCandidate?.displayName || "Sin coincidencia"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">Calle del punto</p>
                        <p className="mt-2">
                          {item.verification.reverseCandidate?.displayName || "Sin calle estimada"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/stations/${item.station.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Corregir estacion
                    </Link>
                    {item.station.source_url ? (
                      <a
                        href={item.station.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Abrir origen
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {audit.truncated ? (
            <p className="text-sm text-slate-500">
              La auditoria fue truncada por el limite seleccionado.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default ImportAudit;
