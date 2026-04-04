type Props = {
  name: string
  zone: string
  status: 'Disponible' | 'Sin datos' | 'Largas filas'
  updatedAt: string
}

const statusStyles: Record<Props['status'], string> = {
  Disponible: 'bg-emerald-100 text-emerald-700',
  'Sin datos': 'bg-slate-100 text-slate-700',
  'Largas filas': 'bg-amber-100 text-amber-700',
}

export function StationCard({ name, zone, status, updatedAt }: Props) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-slate-500">{zone}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
          {status}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        <span>Último reporte</span>
        <span>{updatedAt}</span>
      </div>
    </article>
  )
}
