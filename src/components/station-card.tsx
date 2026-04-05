import { StationWithLatest } from "@/lib/types";
import { formatAvailability, formatFuelType, formatQueue, formatRelativeTime, getFreshness } from "@/lib/reporting";

export function StationCard({ station }: { station: StationWithLatest & { distanceKm?: number | null } }) {
  const latest = station.latestReport;
  const freshness = latest ? getFreshness(latest.created_at) : null;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{station.name}</h3>
          <p className="text-sm text-slate-600">{station.zone ?? "Sin zona"}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {station.distanceKm != null ? `${station.distanceKm.toFixed(1)} km` : "Sin distancia"}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600">{station.address ?? "Sin dirección"}</p>

      {latest ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{formatFuelType(latest.fuel_type)}</Badge>
            <Badge strong={latest.availability_status === "si_hay"} danger={latest.availability_status === "no_hay"}>
              {formatAvailability(latest.availability_status)}
            </Badge>
            <Badge>{formatQueue(latest.queue_status)}</Badge>
            {freshness ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${freshness.className}`}>{freshness.label}</span> : null}
          </div>
          <p className="text-sm text-slate-600">Último reporte: <span className="font-medium text-slate-800">{formatRelativeTime(latest.created_at)}</span></p>
          {latest.comment ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{latest.comment}</p> : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Sin reportes aún.</div>
      )}
    </article>
  );
}

function Badge({ children, strong = false, danger = false }: { children: React.ReactNode; strong?: boolean; danger?: boolean; }) {
  const style = danger ? "bg-rose-100 text-rose-700" : strong ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>{children}</span>;
}
