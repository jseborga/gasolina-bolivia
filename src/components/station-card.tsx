import { StatusBadge } from "@/components/status-badge";
import { formatDistanceKm } from "@/lib/geo";
import { formatReportDate, getAvailabilityLabel, getFreshness, getFuelLabel, getQueueLabel } from "@/lib/reporting";
import type { StationWithLatest } from "@/lib/types";

type Props = {
  station: StationWithLatest;
  distanceKm?: number | null;
};

const freshnessStyles: Record<string, string> = {
  fresh: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warm: "bg-amber-50 text-amber-700 ring-amber-200",
  stale: "bg-slate-100 text-slate-600 ring-slate-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StationCard({ station, distanceKm }: Props) {
  const report = station.latestReport;
  const freshness = getFreshness(report?.created_at);
  const distanceLabel = formatDistanceKm(distanceKm);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{station.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Zona: {station.zone ?? "Sin zona"}</p>
        </div>
        <StatusBadge availability={report?.availability_status ?? "sin_dato"} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${freshnessStyles[freshness.tone]}`}>
          {freshness.label}
        </span>
        {distanceLabel && (
          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
            {distanceLabel}
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        <p>Dirección: {station.address ?? "Sin dirección"}</p>
        <p className="text-xs text-slate-400">
          Lat: {station.latitude ?? "-"} | Lng: {station.longitude ?? "-"}
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {getFuelLabel(report?.fuel_type)}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            {getQueueLabel(report?.queue_status)}
          </span>
        </div>

        <div className="space-y-1 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Disponibilidad:</span>{" "}
            {getAvailabilityLabel(report?.availability_status)}
          </p>
          <p>
            <span className="font-semibold">Último reporte:</span>{" "}
            {formatReportDate(report?.created_at)}
          </p>
          {report?.comment && (
            <p className="rounded-xl bg-white p-3 text-slate-600">
              {report.comment}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
