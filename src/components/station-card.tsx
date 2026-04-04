import { formatRelativeDate } from "@/lib/format";

type LatestReport = {
  fuel_type: string;
  availability_status: string;
  queue_status: string;
  comment: string | null;
  created_at: string;
};

type Props = {
  name: string;
  zone: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  latestReport?: LatestReport | null;
};

function badgeForAvailability(value?: string) {
  switch (value) {
    case "si_hay":
      return "bg-emerald-100 text-emerald-700";
    case "no_hay":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function labelAvailability(value?: string) {
  switch (value) {
    case "si_hay":
      return "Sí hay";
    case "no_hay":
      return "No hay";
    default:
      return "Sin dato";
  }
}

function labelQueue(value?: string) {
  switch (value) {
    case "corta":
      return "Corta";
    case "media":
      return "Media";
    case "larga":
      return "Larga";
    default:
      return "Sin dato";
  }
}

function labelFuel(value?: string) {
  switch (value) {
    case "especial":
      return "Especial";
    case "premium":
      return "Premium";
    case "diesel":
      return "Diésel";
    default:
      return "Sin dato";
  }
}

export function StationCard({
  name,
  zone,
  address,
  latitude,
  longitude,
  latestReport,
}: Props) {
  return (
    <article className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-slate-600">Zona: {zone}</p>
        </div>

        <div
          className={`badge ${
            latestReport ? badgeForAvailability(latestReport.availability_status) : "bg-slate-100 text-slate-700"
          }`}
        >
          {latestReport ? labelAvailability(latestReport.availability_status) : "Sin reportes"}
        </div>
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <p>Dirección: {address ?? "Sin dirección"}</p>
        <p className="text-xs text-slate-400">
          Lat: {latitude ?? "-"} | Lng: {longitude ?? "-"}
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        {latestReport ? (
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-slate-900 text-white">
                {labelFuel(latestReport.fuel_type)}
              </span>
              <span className="badge bg-sky-100 text-sky-700">
                Fila: {labelQueue(latestReport.queue_status)}
              </span>
            </div>

            <p>
              <span className="font-medium">Último reporte:</span>{" "}
              {formatRelativeDate(latestReport.created_at)}
            </p>

            {latestReport.comment && (
              <p className="rounded-xl bg-white px-3 py-2 text-slate-600">
                {latestReport.comment}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Aún no hay reportes recientes para este surtidor.
          </p>
        )}
      </div>
    </article>
  );
}
