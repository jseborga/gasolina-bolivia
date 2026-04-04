
import { Header } from '@/components/Header'
import { StationCard } from '@/components/StationCard'
import { supabase } from '@/lib/supabase'

type Station = {
  id: number
  name: string
  zone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
}

export default async function HomePage() {
  const { data, error } = await supabase
    .from('stations')
    .select('id, name, zone, address, latitude, longitude, is_active')
    .eq('is_active', true)
    .order('id', { ascending: true })

  const stations = (data ?? []) as Station[]

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6">
      <Header />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Mapa / zona de reportes</h2>
            <span className="text-sm text-slate-500">Próxima etapa</span>
          </div>
          <div className="mt-4 flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-slate-500">
            Aquí irá el mapa interactivo con Leaflet o Mapbox, conectado a los surtidores guardados en Supabase.
          </div>
        </div>

        <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Estado de conexión</h2>
          <p className="mt-2 text-sm text-slate-500">
            Esta versión ya intenta leer los surtidores desde Supabase usando las variables de entorno del servidor.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {error ? (
              <div>
                <p className="font-semibold text-red-700">Error al leer Supabase</p>
                <p className="mt-2 text-sm text-red-600">{error.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Revisa variables, tabla <code>stations</code> y políticas RLS.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-emerald-700">Conexión exitosa</p>
                <p className="mt-2 text-sm text-slate-600">
                  Surtidores activos cargados: <strong>{stations.length}</strong>
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Surtidores activos</h2>
          <span className="text-sm text-slate-500">Datos desde Supabase</span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            No se pudo cargar la tabla <code>stations</code>.
          </div>
        ) : stations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            No hay surtidores cargados todavía.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                name={station.name}
                zone={station.zone}
                address={station.address}
                latitude={station.latitude}
                longitude={station.longitude}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
