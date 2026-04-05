"use client";

import { useEffect, useState } from "react";
import type { Report, ReportInput, StationWithLatest } from "@/lib/types";

type ReportFormProps = {
  stations: StationWithLatest[];
  defaultStationId?: number;
  onSubmit: (input: ReportInput) => Promise<{ ok: boolean; message: string }>;
  onCreated?: (report: Report) => void;
};

const fuelOptions: { value: ReportInput["fuel_type"]; label: string }[] = [
  { value: "especial", label: "Especial" },
  { value: "premium", label: "Premium" },
  { value: "diesel", label: "Diésel" },
];

const availabilityOptions: {
  value: ReportInput["availability_status"];
  label: string;
}[] = [
  { value: "si_hay", label: "Sí hay" },
  { value: "no_hay", label: "No hay" },
  { value: "sin_dato", label: "Sin dato" },
];

const queueOptions: { value: ReportInput["queue_status"]; label: string }[] = [
  { value: "corta", label: "Fila corta" },
  { value: "media", label: "Fila media" },
  { value: "larga", label: "Fila larga" },
  { value: "sin_dato", label: "Sin dato" },
];

export function ReportForm({
  stations,
  defaultStationId,
  onSubmit,
}: ReportFormProps) {
  const [stationId, setStationId] = useState<number>(defaultStationId ?? stations[0]?.id ?? 0);
  const [fuelType, setFuelType] = useState<ReportInput["fuel_type"]>("especial");
  const [availabilityStatus, setAvailabilityStatus] =
    useState<ReportInput["availability_status"]>("si_hay");
  const [queueStatus, setQueueStatus] =
    useState<ReportInput["queue_status"]>("media");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (defaultStationId) {
      setStationId(defaultStationId);
    }
  }, [defaultStationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!stationId) {
      setFeedback({ ok: false, message: "Selecciona un surtidor." });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        station_id: stationId,
        fuel_type: fuelType,
        availability_status: availabilityStatus,
        queue_status: queueStatus,
        comment: comment.trim() || undefined,
      });

      setFeedback(result);

      if (result.ok) {
        setComment("");
      }
    } catch {
      setFeedback({ ok: false, message: "No se pudo enviar el reporte." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Surtidor</span>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          value={stationId}
          onChange={(e) => setStationId(Number(e.target.value))}
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Combustible</span>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value as ReportInput["fuel_type"])}
        >
          {fuelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Disponibilidad</span>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          value={availabilityStatus}
          onChange={(e) =>
            setAvailabilityStatus(
              e.target.value as ReportInput["availability_status"]
            )
          }
        >
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Estado de fila</span>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          value={queueStatus}
          onChange={(e) =>
            setQueueStatus(e.target.value as ReportInput["queue_status"])
          }
        >
          {queueOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Comentario</span>
        <textarea
          className="min-h-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          placeholder="Ej.: fila avanza rápido, solo especial, etc."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Enviar reporte"}
      </button>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </form>
  );
}
