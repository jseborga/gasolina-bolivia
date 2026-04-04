type StationCardProps = {
  name: string;
  zone: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  latestReport?: {
    fuel_type: string;
    availability_status: string;
    queue_status: string;
    comment?: string | null;
    created_at: string;
  } | null;
};

function translateAvailability(status: string) {
  switch (status) {
    case "si_hay":
      return "Sí hay";
    case "no_hay":
      return "No hay";
    default:
      return "Sin dato";
  }
}

function translateQueue(status: string) {
  switch (status) {
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

export function StationCard({
  name,
  zone,
  address,
  latitude,
  longitude,
  latestReport,
}: StationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600">Zona: {zone}</p>

      <p className="mt-2 text-sm text-slate-700">
        Estado: <span className="font-medium">{latestReport ? "Con reportes" : "Activo"}</span>
      </p>

      {address ? (
        <p className="mt-2 text-sm text-slate-600">Dirección: {address}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Dirección: Sin dirección</p>
      )}

      {latitude != null && longitude != null && (
        <p className="mt-1 text-xs text-slate-400">
          Lat: {latitude} | Lng: {longitude}
        </p>
      )}

      {latestReport ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <p><span className="font-medium">Combustible:</span> {latestReport.fuel_type}</p>
          <p><span className="font-medium">Disponibilidad:</span> {translateAvailability(latestReport.availability_status)}</p>
          <p><span className="font-medium">Fila:</span> {translateQueue(latestReport.queue_status)}</p>
          <p><span className="font-medium">Último reporte:</span> {new Date(latestReport.created_at).toLocaleString("es-BO")}</p>
          {latestReport.comment ? (
            <p className="mt-1 text-slate-600"><span className="font-medium">Comentario:</span> {latestReport.comment}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          Sin reportes recientes todavía.
        </div>
      )}
    </div>
  );
}
