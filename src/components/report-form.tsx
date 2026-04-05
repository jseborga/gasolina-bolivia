"use client";

import { useState } from "react";
import { Report, StationWithLatest, FuelType, AvailabilityStatus, QueueStatus } from "@/lib/types";

export function ReportForm({
  stations,
  onCreated,
}: {
  stations: StationWithLatest[];
  onCreated: (report: Report) => void;
}) {
  const [stationId, setStationId] = useState<string>(stations[0]?.id?.toString() ?? "");
  const [fuelType, setFuelType] = useState<FuelType>("especial");
  const [availability, setAvailability] = useState<AvailabilityStatus>("si_hay");
  const [queue, setQueue] = useState<QueueStatus>("media");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        station_id: Number(stationId),
        fuel_type: fuelType,
        availability_status: availability,
        queue_status: queue,
        comment: comment.trim() || null,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setSaving(false);
      setMessage(data.error ?? "No se pudo guardar.");
      return;
    }

    onCreated(data.report as Report);
    setComment("");
    setSaving(false);
    setMessage("Reporte guardado.");
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Reporte rápido</h2>
      <p className="mt-1 text-sm text-slate-600">Registra disponibilidad y fila en segundos.</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="Surtidor">
          <select value={stationId} onChange={(e) => setStationId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500" required>
            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Combustible">
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500">
              <option value="especial">Especial</option>
              <option value="premium">Premium</option>
              <option value="diesel">Diésel</option>
            </select>
          </Field>
          <Field label="Disponibilidad">
            <select value={availability} onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500">
              <option value="si_hay">Sí hay</option>
              <option value="no_hay">No hay</option>
              <option value="sin_dato">Sin dato</option>
            </select>
          </Field>
        </div>

        <Field label="Fila">
          <select value={queue} onChange={(e) => setQueue(e.target.value as QueueStatus)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500">
            <option value="corta">Corta</option>
            <option value="media">Media</option>
            <option value="larga">Larga</option>
            <option value="sin_dato">Sin dato</option>
          </select>
        </Field>

        <Field label="Comentario opcional">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Ej.: avanza rápido, solo premium, fila hasta la esquina..." className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500" />
        </Field>

        <button type="submit" disabled={saving || !stationId} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar reporte"}
        </button>

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
