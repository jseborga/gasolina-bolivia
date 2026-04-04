type StationCardProps = {
  name: string
  zone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

export function StationCard({ name, zone, address, latitude, longitude }: StationCardProps) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-slate-600">Zona: {zone ?? 'Sin zona'}</p>
          <p className="mt-1 text-sm text-slate-500">Dirección: {address ?? 'Sin dirección'}</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">Activo</span>
      </div>
      <div className="mt-4 text-xs text-slate-400">
        Lat: {latitude ?? '-'} · Lng: {longitude ?? '-'}
      </div>
    </article>
  )
}
