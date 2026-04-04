import { ReportForm } from "@/components/report-form";
import { StationCard } from "@/components/station-card";
import { getSupabaseClient } from "@/lib/supabase";

type Station = {
  id: number;
  name: string;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

type Report = {
  id: number;
  station_id: number;
  fuel_type: string;
  availability_status: string;
  queue_status: string;
  comment: string | null;
  created_at: string;
};

export default async function HomePage() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <main className="min-h-screen">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="card-surface p-6 text-red-700">
            Faltan variables de entorno de Supabase.
          </div>
        </section>
      </main>
    );
  }

  const [{ data: stationsData, error: stationsError }, { data: reportsData, error: reportsError }] =
    await Promise.all([
      supabase
        .from("stations")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const stations = ((stationsData ?? []) as Station[]).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const reports = (reportsData ?? []) as Report[];

  const latestReportsByStation = new Map<number, Report>();
  for (const report of reports) {
    if (!latestReportsByStation.has(report.station_id)) {
      latestReportsByStation.set(report.station_id, report);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card-surface overflow-hidden p-7">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="badge bg-slate-900 text-white">SurtiMapa</div>
              <div className="badge bg-emerald-100 text-emerald-700">
                MVP operativo
              </div>
            </div>

            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Estado colaborativo de surtidores y filas en La Paz
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Consulta rápido qué surtidor tiene reportes recientes, registra disponibilidad
              de combustible y deja a la app lista para la siguiente fase con mapa, filtros y geolocalización.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Surtidores activos
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {stations.length}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Reportes cargados
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {reports.length}
                </div>
              </div>
            </div>
          </div>

          <div className="card-surface p-7">
            <h2 className="text-xl font-semibold text-slate-900">
              Mapa / zona de reportes
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              En esta fase se priorizó una experiencia más clara y usable. El siguiente paso
              será integrar mapa real con pines por estado, geolocalización y filtros por zona.
            </p>

            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-100 p-4 text-sm font-medium text-emerald-800">
                  Sí hay
                </div>
                <div className="rounded-2xl bg-rose-100 p-4 text-sm font-medium text-rose-800">
                  No hay
                </div>
                <div className="rounded-2xl bg-amber-100 p-4 text-sm font-medium text-amber-800">
                  Sin dato
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Placeholder visual listo para reemplazarse por el mapa real.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <ReportForm
            stations={stations.map((station) => ({
              id: station.id,
              name: station.name,
              zone: station.zone,
            }))}
          />
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Surtidores activos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Último reporte visible por estación para tomar decisiones rápidas.
            </p>
          </div>
        </div>

        {stationsError || reportsError ? (
          <div className="card-surface p-5 text-red-700">
            Error al leer Supabase: {stationsError?.message || reportsError?.message}
          </div>
        ) : stations.length === 0 ? (
          <div className="card-surface p-5 text-slate-600">
            No hay surtidores activos cargados en Supabase.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                name={station.name}
                zone={station.zone ?? "Sin zona"}
                address={station.address}
                latitude={station.latitude}
                longitude={station.longitude}
                latestReport={latestReportsByStation.get(station.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
