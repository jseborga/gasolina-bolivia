"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AISuggestionSimulatorCard() {
  const router = useRouter();
  const [count, setCount] = useState("4");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-suggestions/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: Number(count) }),
      });
      const json = (await response.json()) as { count?: number; error?: string };

      if (!response.ok) {
        throw new Error(json.error || "No se pudieron generar sugerencias demo.");
      }

      setMessage(`Se generaron ${json.count ?? Number(count)} sugerencias demo para revision.`);
      router.refresh();
    } catch (simulationError) {
      setError(
        simulationError instanceof Error
          ? simulationError.message
          : "No se pudieron generar sugerencias demo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            Simulador de pruebas
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Generar sugerencias probables de estaciones
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea borradores demo usando estaciones activas y la hora local de La Paz. No se
            publican solas: quedan pendientes para revision.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Cantidad</span>
            <input
              type="number"
              min="1"
              max="8"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={runSimulation}
            className="rounded-2xl bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {loading ? "Generando..." : "Generar demo"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export default AISuggestionSimulatorCard;
