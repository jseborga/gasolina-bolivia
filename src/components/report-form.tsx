"use client";

import { useState, useTransition } from "react";
import { submitReport } from "@/app/report-actions";
import type { Station } from "@/lib/types";

type Props = {
  stations: Station[];
};

export function ReportForm({ stations }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reporte rápido</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra disponibilidad y estado de fila en segundos.
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          MVP activo
        </span>
      </div>

      <form
        action={(formData) => {
          setMessage(null);
          startTransition(async () => {
            const result = await submitReport(formData);
            setMessage(result.message);
          });
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="station_id" className="mb-2 block text-sm font-medium text-slate-700">
            Surtidor
          </label>
          <select
            id="station_id"
            name="station_id"
            required
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-slate-900"
            defaultValue={stations[0]?.id ?? ""}
          >
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} - {station.zone ?? "Sin zona"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="fuel_type" className="mb-2 block text-sm font-medium text-slate-700">
              Combustible
            </label>
            <select
              id="fuel_type"
              name="fuel_type"
              required
              defaultValue="especial"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:border-slate-900"
            >
              <option value="especial">Especial</option>
              <option value="premium">Premium</option>
              <option value="diesel">Diésel</option>
            </select>
          </div>

          <div>
            <label htmlFor="availability_status" className="mb-2 block text-sm font-medium text-slate-700">
              Disponibilidad
            </label>
            <select
              id="availability_status"
              name="availability_status"
              required
              defaultValue="si_hay"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:border-slate-900"
            >
              <option value="si_hay">Sí hay</option>
              <option value="no_hay">No hay</option>
              <option value="sin_dato">Sin dato</option>
            </select>
          </div>

          <div>
            <label htmlFor="queue_status" className="mb-2 block text-sm font-medium text-slate-700">
              Fila
            </label>
            <select
              id="queue_status"
              name="queue_status"
              required
              defaultValue="media"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:border-slate-900"
            >
              <option value="corta">Corta</option>
              <option value="media">Media</option>
              <option value="larga">Larga</option>
              <option value="sin_dato">Sin dato</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="mb-2 block text-sm font-medium text-slate-700">
            Comentario opcional
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            placeholder="Ej: fila avanza rápido, premium agotada, ingreso lento, etc."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending || stations.length === 0}
            className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar reporte"}
          </button>

          {message && (
            <p className="text-sm text-slate-600">{message}</p>
          )}
        </div>
      </form>
    </section>
  );
}
