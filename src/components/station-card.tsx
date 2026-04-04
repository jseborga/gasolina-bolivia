type StationCardProps = {
  name: string;
  zone: string;
  status?: string;
  updatedAt?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function StationCard({
  name,
  zone,
  status,
  updatedAt,
  address,
  latitude,
  longitude,
}: StationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600">Zona: {zone}</p>

      {status && (
        <p className="mt-2 text-sm text-slate-700">
          Estado: <span className="font-medium">{status}</span>
        </p>
      )}

      {updatedAt && (
        <p className="mt-1 text-xs text-slate-500">Actualizado: {updatedAt}</p>
      )}

      {address && <p className="mt-2 text-sm text-slate-600">Dirección: {address}</p>}

      {latitude != null && longitude != null && (
        <p className="mt-1 text-xs text-slate-400">
          Lat: {latitude} | Lng: {longitude}
        </p>
      )}
    </div>
  );
}
