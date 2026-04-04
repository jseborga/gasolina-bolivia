"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StationOption = {
  id: number;
  name: string;
  zone: string | null;
};

type Props = {
  stations: StationOption[];
};

export function ReportForm({ stations }: Props) {
  const router = useRouter();
  const [stationId, setStationId] = useState(stations[0]?.id?.toString() ?? "");
  const [fuelType, setFuelType] = useState("especial");
  const [availabilityStatus, setAvailabilityStatus] = useState("si_hay");
  const [queueStatus, setQueueStatus] = useState("media");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setMessageType(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          station_id: Number(stationId),
          fuel_type: fuelType,
          availability_status: availabilityStatus,
          queue_status: queueStatus,
          comment: comment.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar el reporte.");
      }

      setMessage("Reporte guardado correctamente.");
      setMessageType("success");
      setComment("");
      router.refresh();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No se pudo guardar el reporte.";
      setMessage(text);
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface p-6 lg:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reporte rápido</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registra disponibilidad y estado de fila en segundos.
          </p>
        </div>
        <div className="badge bg-slate-900 text-white">MVP activo</div>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Surtidor
          </label>
          <select
            className="input-base"
            value={stationId}
            onChange={(event) => setStationId(event.target.value)}
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
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Combustible
            </label>
            <select
              className="input-base"
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
            >
              <option value="especial">Especial</option>
              <option value="premium">Premium</option>
              <option value="diesel">Diésel</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Disponibilidad
            </label>
            <select
              className="input-base"
              value={availabilityStatus}
              onChange={(event) => setAvailabilityStatus(event.target.value)}
            >
              <option value="si_hay">Sí hay</option>
              <option value="no_hay">No hay</option>
              <option value="sin_dato">Sin dato</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Fila
            </label>
            <select
              className="input-base"
              value={queueStatus}
              onChange={(event) => setQueueStatus(event.target.value)}
            >
              <option value="corta">Corta</option>
              <option value="media">Media</option>
              <option value="larga">Larga</option>
              <option value="sin_dato">Sin dato</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Comentario opcional
          </label>
          <textarea
            className="input-base min-h-28 resize-y"
            placeholder="Ej.: fila avanza rápido, premium agotada, ingreso lento, etc."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSaving || !stationId}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar reporte"}
        </button>

        {message && (
          <div
            className={
              messageType === "success"
                ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                : "rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message}
          </div>
        )}
      </div>
    </form>
  );
}
