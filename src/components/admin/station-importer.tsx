"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  StationImportAction,
  StationImportApplyItem,
  StationImportPreviewItem,
} from "@/lib/admin-types";

type PreviewResponse = {
  items: StationImportPreviewItem[];
  totalEntries: number;
  truncated: boolean;
};

const actionOptions: Array<{ label: string; value: StationImportAction }> = [
  { label: "Crear", value: "create" },
  { label: "Actualizar", value: "update" },
  { label: "Revisar", value: "review" },
  { label: "Saltar", value: "skip" },
];

function formatDistance(value: number | null) {
  if (value == null) return "Sin distancia";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(2)} km`;
}

type EditablePreviewItem = StationImportPreviewItem & {
  selectedAction: StationImportAction;
};

export function StationImporter() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<EditablePreviewItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ totalEntries: number; truncated: boolean } | null>(null);

  const actionableCount = useMemo(
    () => items.filter((item) => item.selectedAction === "create" || item.selectedAction === "update").length,
    [items]
  );

  const analyze = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Pega uno o varios resultados para analizar.");
      setMessage(null);
      return;
    }

    setAnalyzing(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/stations/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });

      const json = (await res.json()) as PreviewResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo analizar el lote.");
      }

      setItems(
        json.items.map((item) => ({
          ...item,
          selectedAction: item.recommendedAction,
        }))
      );
      setMeta({
        totalEntries: json.totalEntries,
        truncated: json.truncated,
      });
      setMessage("Vista previa generada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el lote.");
      setItems([]);
      setMeta(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const apply = async () => {
    if (actionableCount === 0) {
      setError("No hay elementos marcados para crear o actualizar.");
      setMessage(null);
      return;
    }

    setApplying(true);
    setError(null);
    setMessage(null);

    const payload: StationImportApplyItem[] = items.map((item) => ({
      raw: item.raw,
      incomingAddress: item.incomingAddress,
      incomingLatitude: item.incomingLatitude,
      incomingLongitude: item.incomingLongitude,
      incomingName: item.incomingName,
      matchId: item.match?.id ?? null,
      sourceUrl: item.sourceUrl,
      action: item.selectedAction,
    }));

    try {
      const res = await fetch("/api/admin/stations/import-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      const json = (await res.json()) as {
        created?: Array<{ id: number; name: string }>;
        updated?: Array<{ id: number; name: string }>;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "No se pudo aplicar el lote.");
      }

      setMessage(
        `Lote aplicado. Creadas: ${json.created?.length ?? 0}. Actualizadas: ${json.updated?.length ?? 0}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el lote.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-slate-900">Importar lote desde Google Maps</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pega una entrada por línea o por bloque. El algoritmo resuelve la URL,
              compara nombre, dirección y distancia con las estaciones existentes y
              sugiere crear, actualizar o revisar.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Formatos útiles: `Nombre | Dirección | URL`, una URL por línea o texto
              pegado desde Google Maps.
            </p>
          </div>

          <Link
            href="/admin/stations/new"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Nueva estación manual
          </Link>
          <Link
            href="/admin/stations/import/review"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Auditar importadas
          </Link>
        </div>

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={10}
          className="mt-5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          placeholder={"Ejemplo:\nYPFB Calacoto | Av. Ballivián, La Paz | https://maps.app.goo.gl/...\n\nSurtidor XYZ, Av. Busch, La Paz https://www.google.com/maps/..."}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={analyze}
            disabled={analyzing}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {analyzing ? "Analizando..." : "Analizar lote"}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying || actionableCount === 0}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {applying ? "Aplicando..." : `Aplicar lote (${actionableCount})`}
          </button>
          {message ? <span className="self-center text-sm text-emerald-700">{message}</span> : null}
          {error ? <span className="self-center text-sm text-red-700">{error}</span> : null}
        </div>
      </section>

      {meta ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Entradas analizadas: {items.length} de {meta.totalEntries}.
            {meta.truncated ? " Se limitó la vista previa a las primeras 20." : ""}
          </p>
        </section>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <section key={`${item.raw}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3 xl:max-w-3xl">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Entrada {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.incomingName}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.incomingAddress || "Sin dirección detectada"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.raw}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Score {item.matchScore.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Nombre {item.nameScore.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Dirección {item.addressScore.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Distancia {formatDistance(item.distanceKm)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Coordenadas {item.incomingLatitude != null && item.incomingLongitude != null ? "sí" : "no"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{item.reason}</p>

                  {item.match ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Mejor coincidencia: {item.match.name}</p>
                      <p className="mt-1">
                        {[item.match.address, item.match.zone, item.match.city].filter(Boolean).join(" | ") || "Sin dirección"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Punto actual: {item.match.latitude != null && item.match.longitude != null
                          ? `${item.match.latitude.toFixed(6)}, ${item.match.longitude.toFixed(6)}`
                          : "sin coordenadas"}
                      </p>
                      <div className="mt-3">
                        <Link
                          href={`/admin/stations/${item.match.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          Abrir edición
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                    >
                      Abrir origen
                    </a>
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

export default StationImporter;
