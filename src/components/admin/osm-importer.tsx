"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OSMImportMap } from "@/components/admin/osm-import-map";
import type {
  OSMImportApplyItem,
  OSMImportPreviewItem,
  OSMImportPreviewResponse,
} from "@/lib/admin-osm-types";
import type { StationImportAction } from "@/lib/admin-types";
import { SUPPORT_SERVICE_OPTIONS, getSupportServiceLabel } from "@/lib/services";
import type { SupportServiceCategory } from "@/lib/types";

const actionOptions: Array<{ label: string; value: StationImportAction }> = [
  { label: "Crear", value: "create" },
  { label: "Actualizar", value: "update" },
  { label: "Revisar", value: "review" },
  { label: "Saltar", value: "skip" },
];

type EditablePreviewItem = OSMImportPreviewItem & {
  selectedAction: StationImportAction;
};

function formatDistance(value: number | null) {
  if (value == null) return "Sin distancia";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(2)} km`;
}

export function OSMImporter() {
  const [department, setDepartment] = useState("Santa Cruz");
  const [country, setCountry] = useState("Bolivia");
  const [target, setTarget] = useState<"stations" | "services">("stations");
  const [serviceCategory, setServiceCategory] =
    useState<SupportServiceCategory>("taller_mecanico");
  const [items, setItems] = useState<EditablePreviewItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    fetchedCount: number;
    note: string | null;
    query: string;
    totalEntries: number;
    truncated: boolean;
  } | null>(null);

  const actionableCount = useMemo(
    () => items.filter((item) => item.selectedAction === "create" || item.selectedAction === "update").length,
    [items]
  );

  const selectedItem = items[selectedIndex] ?? null;

  const analyze = async () => {
    const trimmedDepartment = department.trim();
    const trimmedCountry = country.trim() || "Bolivia";

    if (!trimmedDepartment) {
      setError("Debes indicar un departamento o área.");
      setMessage(null);
      return;
    }

    setLoadingPreview(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/osm-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: trimmedCountry,
          department: trimmedDepartment,
          serviceCategory: target === "services" ? serviceCategory : undefined,
          target,
        }),
      });

      const json = (await res.json()) as OSMImportPreviewResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo consultar OpenStreetMap.");
      }

      setItems(
        json.items.map((item) => ({
          ...item,
          selectedAction: item.recommendedAction,
        }))
      );
      setSelectedIndex(0);
      setMeta({
        fetchedCount: json.fetchedCount,
        note: json.note,
        query: json.query,
        totalEntries: json.totalEntries,
        truncated: json.truncated,
      });
      setMessage("Vista previa OSM generada.");
    } catch (err) {
      setItems([]);
      setMeta(null);
      setError(err instanceof Error ? err.message : "No se pudo consultar OpenStreetMap.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const apply = async () => {
    if (actionableCount === 0) {
      setError("No hay elementos marcados para crear o actualizar.");
      setMessage(null);
      return;
    }

    setLoadingApply(true);
    setMessage(null);
    setError(null);

    const payload: OSMImportApplyItem[] = items.map((item) => ({
      action: item.selectedAction,
      matchId: item.match?.id ?? null,
      servicePayload: item.servicePayload,
      stationPayload: item.stationPayload,
      target: item.target,
    }));

    try {
      const res = await fetch("/api/admin/osm-import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const json = (await res.json()) as {
        created?: Array<{ id: number; name: string; target: string }>;
        updated?: Array<{ id: number; name: string; target: string }>;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "No se pudo aplicar el lote OSM.");
      }

      setMessage(
        `Lote aplicado. Creados: ${json.created?.length ?? 0}. Actualizados: ${json.updated?.length ?? 0}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el lote OSM.");
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-slate-900">
              Importación masiva desde OpenStreetMap
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Busca estaciones o servicios en OpenStreetMap desde el admin, revisa el
              punto en mapa, aprueba crear/actualizar y recién después aplica a la base.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              El flujo público no cambia. Esta herramienta solo vive en admin y sirve
              para carga masiva con revisión previa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/stations/import"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar desde Google Maps
            </Link>
            <Link
              href="/admin/stations/import/review"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Auditar importadas
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Tipo</span>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as "stations" | "services")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="stations">Estaciones de servicio</option>
              <option value="services">Servicios auxiliares</option>
            </select>
          </label>

          {target === "services" ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">Categoría</span>
              <select
                value={serviceCategory}
                onChange={(event) =>
                  setServiceCategory(event.target.value as SupportServiceCategory)
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {SUPPORT_SERVICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Departamento / área</span>
            <input
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              placeholder="Santa Cruz"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">País</span>
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              placeholder="Bolivia"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={loadingPreview}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loadingPreview ? "Consultando OSM..." : "Buscar y generar preview"}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={loadingApply || actionableCount === 0}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingApply ? "Aplicando..." : `Aplicar lote (${actionableCount})`}
          </button>
          {message ? <span className="self-center text-sm text-emerald-700">{message}</span> : null}
          {error ? <span className="self-center text-sm text-red-700">{error}</span> : null}
        </div>
      </section>

      {meta ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <p>
              Elementos recibidos desde OSM: {meta.fetchedCount}. Candidatos útiles:{" "}
              {items.length} de {meta.totalEntries}.
              {meta.truncated ? " La vista previa se limitó a los primeros 80." : ""}
            </p>
            {meta.note ? <p className="text-amber-700">{meta.note}</p> : null}
            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer font-medium text-slate-700">
                Ver query Overpass usado
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {meta.query}
              </pre>
            </details>
          </div>
        </section>
      ) : null}

      {selectedItem ? (
        <section className="grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Seleccionado
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedItem.incomingName}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedItem.incomingAddress || "Sin dirección detectada"}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {selectedItem.target === "stations"
                  ? "Estación"
                  : getSupportServiceLabel(
                      selectedItem.servicePayload?.category ?? serviceCategory
                    )}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Score {selectedItem.matchScore.toFixed(2)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Nombre {selectedItem.nameScore.toFixed(2)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Dirección {selectedItem.addressScore.toFixed(2)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Distancia {formatDistance(selectedItem.distanceKm)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Candidato OSM</p>
                <p className="mt-1">
                  {[selectedItem.incomingZone, selectedItem.incomingCity]
                    .filter(Boolean)
                    .join(" | ") || "Sin zona/ciudad"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedItem.incomingLatitude != null && selectedItem.incomingLongitude != null
                    ? `${selectedItem.incomingLatitude.toFixed(6)}, ${selectedItem.incomingLongitude.toFixed(6)}`
                    : "Sin coordenadas"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">
                  {selectedItem.match ? `Coincidencia actual: ${selectedItem.match.name}` : "Sin coincidencia"}
                </p>
                <p className="mt-1">
                  {selectedItem.match
                    ? [selectedItem.match.address, selectedItem.match.zone, selectedItem.match.city]
                        .filter(Boolean)
                        .join(" | ") || "Sin dirección"
                    : "Se propone crear nuevo registro."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedItem.match?.latitude != null && selectedItem.match.longitude != null
                    ? `${selectedItem.match.latitude.toFixed(6)}, ${selectedItem.match.longitude.toFixed(6)}`
                    : "Sin coordenadas"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Contexto de origen</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                {selectedItem.sourceMeta.brand ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Marca: {selectedItem.sourceMeta.brand}</span>
                ) : null}
                {selectedItem.sourceMeta.operator ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Operador: {selectedItem.sourceMeta.operator}</span>
                ) : null}
                {selectedItem.sourceMeta.products ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Productos: {selectedItem.sourceMeta.products}</span>
                ) : null}
                {selectedItem.sourceMeta.phone ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Tel: {selectedItem.sourceMeta.phone}</span>
                ) : null}
              </div>
              {selectedItem.actionHint ? (
                <p className="mt-3 text-xs text-amber-700">{selectedItem.actionHint}</p>
              ) : null}
              <p className="mt-3 text-sm text-slate-600">{selectedItem.reason}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedItem.sourceUrl ? (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    Abrir origen OSM
                  </a>
                ) : null}
                {selectedItem.match ? (
                  <Link
                    href={
                      selectedItem.target === "stations"
                        ? `/admin/stations/${selectedItem.match.id}`
                        : `/admin/services/${selectedItem.match.id}`
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                  >
                    Abrir edición actual
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <OSMImportMap
            incoming={{
              latitude: selectedItem.incomingLatitude,
              longitude: selectedItem.incomingLongitude,
            }}
            match={{
              latitude: selectedItem.match?.latitude ?? null,
              longitude: selectedItem.match?.longitude ?? null,
            }}
          />
        </section>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <section
              key={`${item.raw}-${index}`}
              className={`rounded-3xl border bg-white p-5 shadow-sm ${
                selectedIndex === index ? "border-slate-900" : "border-slate-200"
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="space-y-3 text-left xl:max-w-3xl"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Elemento {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {item.incomingName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.incomingAddress || "Sin dirección detectada"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      {item.target === "stations"
                        ? "Estación"
                        : getSupportServiceLabel(
                            item.servicePayload?.category ?? serviceCategory
                          )}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Score {item.matchScore.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Distancia {formatDistance(item.distanceKm)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{item.reason}</p>
                </button>

                <div className="min-w-[240px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-700">Acción</span>
                    <select
                      value={item.selectedAction}
                      onChange={(event) => {
                        const nextAction = event.target.value as StationImportAction;
                        setItems((current) =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, selectedAction: nextAction }
                              : candidate
                          )
                        );
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    >
                      {actionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="mt-3 text-xs text-slate-500">
                    Recomendación automática: {item.recommendedAction}
                  </p>
                  {item.match ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Coincide con: {item.match.name}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default OSMImporter;
