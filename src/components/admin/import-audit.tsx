"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ImportAuditMap } from "@/components/admin/import-audit-map";
import { ImportAuditOverviewMap } from "@/components/admin/import-audit-overview-map";
import type {
  StationImportAuditItem,
  StationImportAuditResponse,
} from "@/lib/admin-types";

type AuditStatusFilter = "all" | "missing" | "ok" | "warning";
type StationBatchAction = "delete" | "verify";

const collator = new Intl.Collator("es", { sensitivity: "base" });

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(2)} km`;
}

function formatDelta(delta?: number | null) {
  if (delta == null) return "-";
  return delta > 0 ? `+${delta.toFixed(6)}` : delta.toFixed(6);
}

function getZoneValue(item: StationImportAuditItem) {
  const value = item.station.zone?.trim() || item.station.city?.trim();
  return value && value.length > 0 ? value : "__sin_zona__";
}

function getZoneLabel(value: string) {
  return value === "__sin_zona__" ? "Sin zona" : value;
}

function buildCorrectionHref(item: StationImportAuditItem) {
  const params = new URLSearchParams();

  if (item.verification.addressCandidate) {
    params.set("suggestedLat", item.verification.addressCandidate.latitude.toFixed(6));
    params.set("suggestedLng", item.verification.addressCandidate.longitude.toFixed(6));
    params.set("suggestedAddress", item.verification.addressCandidate.displayName);
  }

  if (item.verification.distanceKm != null) {
    params.set("distanceKm", item.verification.distanceKm.toFixed(3));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `/admin/stations/${item.station.id}${suffix}`;
}

function getStatusCopy(status: StationImportAuditItem["verification"]["status"]) {
  switch (status) {
    case "ok":
      return {
        badge: "Coherente",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "warning":
      return {
        badge: "Revisar",
        className: "bg-amber-100 text-amber-700",
      };
    case "missing":
    default:
      return {
        badge: "Parcial",
        className: "bg-slate-200 text-slate-700",
      };
  }
}

export function ImportAudit() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [mutatingAction, setMutatingAction] = useState<StationBatchAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<StationImportAuditResponse | null>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const runAudit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stations/import-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });

      const json = (await res.json()) as StationImportAuditResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo auditar importadas.");
      }

      setAudit(json);
      setSelectedIds([]);
      setSelectedStationId(json.items[0]?.station.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo auditar importadas.");
      setAudit(null);
      setSelectedIds([]);
      setSelectedStationId(null);
    } finally {
      setLoading(false);
    }
  };

  const zoneOptions = useMemo(
    () =>
      audit
        ? Array.from(new Set(audit.items.map((item) => getZoneValue(item)))).sort((a, b) =>
            collator.compare(getZoneLabel(a), getZoneLabel(b))
          )
        : [],
    [audit]
  );

  const filteredItems = useMemo(() => {
    if (!audit) return [];

    return audit.items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.verification.status === statusFilter;
      const matchesZone = zoneFilter === "all" || getZoneValue(item) === zoneFilter;
      return matchesStatus && matchesZone;
    });
  }, [audit, statusFilter, zoneFilter]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = filteredItems.map((item) => item.station.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));

  const setFocusedStation = (stationId: number) => {
    setSelectedStationId(stationId);
    const node = itemRefs.current[stationId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleSelectedId = (stationId: number) => {
    setSelectedIds((current) =>
      current.includes(stationId)
        ? current.filter((item) => item !== stationId)
        : [...current, stationId]
    );
  };

  const toggleFilteredSelection = () => {
    setSelectedIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const selectByStatus = (status: Exclude<AuditStatusFilter, "all">) => {
    const ids = filteredItems
      .filter((item) => item.verification.status === status)
      .map((item) => item.station.id);
    setSelectedIds((current) => Array.from(new Set([...current, ...ids])));
  };

  const runBatchAction = async (action: StationBatchAction) => {
    if (selectedIds.length === 0) {
      setError("Debes seleccionar al menos una estacion.");
      return;
    }

    if (
      action === "delete" &&
      !window.confirm(
        `Eliminar ${selectedIds.length} estaciones de la auditoria?\n\nEsto tambien eliminara sus reportes asociados.`
      )
    ) {
      return;
    }

    setMutatingAction(action);
    setError(null);

    try {
      const res = await fetch("/api/admin/stations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo ejecutar la validacion masiva.");
      }

      await runAudit();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo ejecutar la validacion masiva."
      );
    } finally {
      setMutatingAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold text-slate-900">Auditar importadas</h2>
              <p className="mt-2 text-sm text-slate-600">
                Revisa estaciones importadas, filtra por zona, selecciona las coherentes
                y valida o elimina el lote sin ir una por una.
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
                {loading ? "Auditando..." : "Buscar y auditar"}
              </button>
            </div>
          </div>

          {audit ? (
            <div className="grid gap-3 xl:grid-cols-[repeat(2,minmax(180px,1fr))_minmax(200px,1fr)]">
              <select
                value={zoneFilter}
                onChange={(event) => setZoneFilter(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="all">Todas las zonas</option>
                {zoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {getZoneLabel(option)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as AuditStatusFilter)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="all">Todos los estados</option>
                <option value="ok">Coherentes</option>
                <option value="warning">Revisar</option>
                <option value="missing">Parcial</option>
              </select>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleFilteredSelection}
                  disabled={filteredIds.length === 0}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {allFilteredSelected ? "Quitar visibles" : "Seleccionar visibles"}
                </button>
                <button
                  type="button"
                  onClick={() => selectByStatus("ok")}
                  disabled={filteredItems.length === 0}
                  className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Seleccionar coherentes
                </button>
                <button
                  type="button"
                  onClick={() => selectByStatus("warning")}
                  disabled={filteredItems.length === 0}
                  className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Seleccionar alertas
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      {audit ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Importadas detectadas</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{audit.importedCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Auditadas ahora</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{audit.items.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Visibles</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {filteredItems.length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Seleccionadas</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">
                {selectedIds.length}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-slate-600">
              Usa la validacion masiva cuando el mapa y la distancia confirmen que el lote
              es coherente. Si detectas estaciones incorrectas, eliminalas directo desde aqui.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpiar seleccion
              </button>
              <button
                type="button"
                onClick={() => runBatchAction("verify")}
                disabled={selectedIds.length === 0 || mutatingAction !== null}
                className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutatingAction === "verify" ? "Validando..." : "Validar seleccionadas"}
              </button>
              <button
                type="button"
                onClick={() => runBatchAction("delete")}
                disabled={selectedIds.length === 0 || mutatingAction !== null}
                className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutatingAction === "delete" ? "Eliminando..." : "Eliminar seleccionadas"}
              </button>
            </div>
          </section>

          <ImportAuditOverviewMap
            items={filteredItems}
            onSelectId={setFocusedStation}
            selectedId={selectedStationId}
          />

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
                  {audit.offsetSuggestion.confidence === "high"
                    ? "Alta confianza"
                    : "Baja confianza"}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Si varias estaciones muestran el mismo desplazamiento, podria haber un
                offset sistematico. Este es el corrimiento mediano estimado con{" "}
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
            {filteredItems.map((item) => {
              const adjustedPoint =
                audit.offsetSuggestion &&
                item.station.latitude != null &&
                item.station.longitude != null
                  ? {
                      latitude: item.station.latitude + audit.offsetSuggestion.latitudeDelta,
                      longitude: item.station.longitude + audit.offsetSuggestion.longitudeDelta,
                    }
                  : null;

              const statusCopy = getStatusCopy(item.verification.status);

              return (
                <section
                  key={item.station.id}
                  ref={(node) => {
                    itemRefs.current[item.station.id] = node;
                  }}
                  className={`rounded-3xl border bg-white p-5 shadow-sm ${
                    item.station.id === selectedStationId
                      ? "border-slate-900 ring-2 ring-slate-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3 xl:max-w-3xl">
                        <div className="flex flex-wrap items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(item.station.id)}
                            onChange={() => toggleSelectedId(item.station.id)}
                            aria-label={`Seleccionar ${item.station.name}`}
                            className="mt-1"
                          />

                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {item.station.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {[item.station.address, item.station.zone, item.station.city]
                                .filter(Boolean)
                                .join(" | ") || "Sin direccion"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Punto actual:{" "}
                              {item.station.latitude != null && item.station.longitude != null
                                ? `${item.station.latitude.toFixed(6)}, ${item.station.longitude.toFixed(6)}`
                                : "sin coordenadas"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${statusCopy.className}`}
                          >
                            {statusCopy.badge}
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
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              item.station.is_verified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.station.is_verified ? "Ya validada" : "Sin validar"}
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
                              {item.verification.addressCandidate?.displayName ||
                                "Sin coincidencia"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <p className="font-medium text-slate-900">Calle del punto</p>
                            <p className="mt-2">
                              {item.verification.reverseCandidate?.displayName ||
                                "Sin calle estimada"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFocusedStation(item.station.id)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Enfocar
                        </button>
                        <Link
                          href={buildCorrectionHref(item)}
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

                    <ImportAuditMap
                      adjusted={adjustedPoint}
                      current={{
                        latitude: item.station.latitude,
                        longitude: item.station.longitude,
                      }}
                      suggested={
                        item.verification.addressCandidate
                          ? {
                              latitude: item.verification.addressCandidate.latitude,
                              longitude: item.verification.addressCandidate.longitude,
                            }
                          : null
                      }
                    />
                  </div>
                </section>
              );
            })}
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
