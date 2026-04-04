import { StatusBadge } from "@/components/status-badge";
import type { StationWithLatest } from "@/lib/types";

function fuelLabel(value?: string | null) {
  if (!value) return "Sin dato";
  if (value === "especial") return "Especial";
  if (value === "premium") return "Premium";
  if (value === "diesel") return "Diésel";
  return value;
}

function queueLabel(value?: string | null) {
  if (!value) return "Sin dato";
  if (value === "corta") return "Fila corta";
  if (value === "media") return "Fila media";
  if (value === "larga") return "Fila larga";
  if (value === "sin_dato") return "Sin dato";
  return value;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin reporte";
  try {
    return new Date(value).toLocaleString("es-BO");
  } catch {
    return value;
  }
}

export function StationCard({ station }: { station: StationWithLatest }) {
  const report = station.latestReport;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{station.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Zona: {station.zone ?? "Sin zona"}</p>
        </div>
        <StatusBadge availability={report?.availability_status ?? "sin_dato"} />
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
            {fuelLabel(report?.fuel_type)}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            {queueLabel(report?.queue_status)}
          </span>
        </div>

        <div className="space-y-1 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Disponibilidad:</span>{" "}
            {report?.availability_status === "si_hay"
              ? "Sí hay"
              : report?.availability_status === "no_hay"
                ? "No hay"
                : "Sin dato"}
          </p>
          <p>
            <span className="font-semibold">Último reporte:</span>{" "}
            {formatDate(report?.created_at)}
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
