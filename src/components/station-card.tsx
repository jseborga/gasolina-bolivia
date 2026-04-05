import { StationWithLatest } from "@/lib/types";
import {
  formatAvailability,
  formatFuelType,
  formatQueue,
  formatRelativeTime,
  getFreshness,
} from "@/lib/reporting";
import { formatDistanceKm } from "@/lib/geo";

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function getFreshnessMeta(freshness: "fresh" | "aging" | "stale" | "none") {
  switch (freshness) {
    case "fresh":
      return {
        label: "Reciente",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "aging":
      return {
        label: "Aún útil",
        className: "bg-amber-100 text-amber-700",
      };
    case "stale":
      return {
        label: "Desactualizado",
        className: "bg-slate-200 text-slate-700",
      };
    case "none":
    default:
      return null;
  }
}

export function StationCard({
  station,
}: {
  station: StationWithLatest & { distanceKm?: number | null };
}) {
  const latest = station.latestReport;
  const freshness = latest ? getFreshnessMeta(getFreshness(latest.created_at)) : null;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{station.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{station.zone || "Sin zona"}</p>
        </div>

        {station.distanceKm != null ? (
          <Badge className="bg-sky-100 text-sky-700">
            {formatDistanceKm(station.distanceKm)}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-600">
          Dirección:{" "}
          <span className="font-medium text-slate-800">
            {station.address || "Sin dirección"}
          </span>
        </p>

        {latest ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-slate-100 text-slate-700">
                {formatFuelType(latest.fuel_type)}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700">
                {formatAvailability(latest.availability_status)}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700">
                {formatQueue(latest.queue_status)}
              </Badge>
              {freshness ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${freshness.className}`}
                >
                  {freshness.label}
                </span>
              ) : null}
            </div>

            <p className="text-sm text-slate-600">
              Último reporte:{" "}
              <span className="font-medium text-slate-800">
                {formatRelativeTime(latest.created_at)}
              </span>
            </p>

            {latest.comment ? (
              <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                {latest.comment}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            Sin reportes todavía.
          </div>
        )}
      </div>
    </article>
  );
}

export default StationCard;
