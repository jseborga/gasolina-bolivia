"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Station } from "@/lib/types";

type Props = {
  stations: Station[];
};

export function ReportForm({ stations }: Props) {
  const [stationId, setStationId] = useState<string>(stations[0]?.id ? String(stations[0].id) : "");
  const [fuelType, setFuelType] = useState<"especial" | "premium" | "diesel">("especial");
  const [availabilityStatus, setAvailabilityStatus] = useState<"si_hay" | "no_hay" | "sin_dato">("si_hay");
  const [queueStatus, setQueueStatus] = useState<"corta" | "media" | "larga" | "sin_dato">("media");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setStatus("Faltan variables de entorno de Supabase.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("reports").insert({
      station_id: Number(stationId),
      fuel_type: fuelType,
      availability_status: availabilityStatus,
      queue_status: queueStatus,
      comment: comment.trim() ? comment.trim() : null,
    });

    if (error) {
      setStatus(`Error al guardar: ${error.message}`);
      setLoading(false);
      return;
    }

    setStatus("Reporte guardado correctamente.");
    setComment("");
    setLoading(false);
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Reporte rápido</h2>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-700">Surtidor</span>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          required
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} - {station.zone ?? "Sin zona"}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Combustible</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as "especial" | "premium" | "diesel")}
          >
            <option value="especial">Especial</option>
            <option value="premium">Premium</option>
            <option value="diesel">Diésel</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Disponibilidad</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value as "si_hay" | "no_hay" | "sin_dato")}
          >
            <option value="si_hay">Sí hay</option>
            <option value="no_hay">No hay</option>
            <option value="sin_dato">Sin dato</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">Fila</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={queueStatus}
            onChange={(e) => setQueueStatus(e.target.value as "corta" | "media" | "larga" | "sin_dato")}
          >
            <option value="corta">Corta</option>
            <option value="media">Media</option>
            <option value="larga">Larga</option>
            <option value="sin_dato">Sin dato</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-700">Comentario opcional</span>
        <textarea
          className="min-h-24 rounded-lg border border-slate-300 px-3 py-2"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ej.: fila avanza rápido, premium agotada, etc."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !stationId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar reporte"}
        </button>
        {status ? <span className="text-sm text-slate-600">{status}</span> : null}
      </div>
    </form>
  );
}
