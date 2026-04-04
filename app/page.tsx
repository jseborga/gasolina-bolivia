import { Header } from '@/components/Header'
import { StationCard } from '@/components/StationCard'

const demoStations = [
  { name: 'Surtidor El Volcán', zone: 'Miraflores', status: 'Disponible' as const, updatedAt: 'hace 5 min' },
  { name: 'Surtidor Sopocachi', zone: 'Sopocachi', status: 'Largas filas' as const, updatedAt: 'hace 8 min' },
  { name: 'Surtidor Obrajes', zone: 'Obrajes', status: 'Sin datos' as const, updatedAt: 'sin reportes recientes' },
]

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6">
      <Header />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Mapa / zona de reportes</h2>
            <span className="text-sm text-slate-500">Versión inicial</span>
          </div>
          <div className="mt-4 flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
            Aquí irá el mapa interactivo con Leaflet o Mapbox.
          </div>
        </div>

        <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Reporte rápido</h2>
          <p className="mt-2 text-sm text-slate-500">
            Flujo MVP: elegir surtidor, marcar si hay combustible y seleccionar el estado de la fila.
          </p>

          <div className="mt-5 grid gap-3">
            <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Sí hay gasolina</button>
            <button className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">No hay gasolina</button>
            <div className="grid grid-cols-3 gap-2">
              <button className="rounded-xl bg-emerald-100 px-3 py-3 text-sm font-medium text-emerald-700">Fila corta</button>
              <button className="rounded-xl bg-amber-100 px-3 py-3 text-sm font-medium text-amber-700">Fila media</button>
              <button className="rounded-xl bg-rose-100 px-3 py-3 text-sm font-medium text-rose-700">Fila larga</button>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Surtidores recientes</h2>
          <a href="/api/health" className="text-sm font-medium text-slate-700 underline">
            Probar healthcheck
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoStations.map((station) => (
            <StationCard key={station.name} {...station} />
          ))}
        </div>
      </section>
    </main>
  )
}
