type StationCardProps = {
  name: string;
  zone: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function StationCard({
  name,
  zone,
  address,
  latitude,
  longitude,
}: StationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600">Zona: {zone}</p>

      {address ? (
        <p className="mt-2 text-sm text-slate-600">Dirección: {address}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Dirección no registrada</p>
      )}

      {latitude != null && longitude != null && (
        <p className="mt-1 text-xs text-slate-400">
          Lat: {latitude} | Lng: {longitude}
        </p>
      )}
    </div>
  );
}
