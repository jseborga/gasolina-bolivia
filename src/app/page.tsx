import { getSupabaseClient } from "@/lib/supabase";
import { StationCard } from "@/components/station-card";
import { ReportForm } from "@/components/report-form";
import type { Station, LatestReport } from "@/lib/types";

type ReportRow = LatestReport & { id: number };

export default async function HomePage() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-bold text-slate-900">SurtiMapa</h1>
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Faltan variables de entorno de Supabase en el build o runtime.
          </div>
        </section>
      </main>
    );
  }

  const { data: stationsData, error: stationsError } = await supabase
    .from("stations")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  const { data: reportsData, error: reportsError } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  const stations = (stationsData ?? []) as Station[];
  const reports = (reportsData ?? []) as ReportRow[];

  const latestByStation = new Map<number, ReportRow>();
  for (const report of reports) {
    if (!latestByStation.has(report.station_id)) {
      latestByStation.set(report.station_id, report);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">SurtiMapa</h1>
          <p className="mt-2 text-slate-600">
            Estado colaborativo de surtidores y filas en La Paz.
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Mapa / zona de reportes</h2>
          <p className="mt-2 text-slate-600">
            Base funcional del MVP. El siguiente paso será mapa real con geolocalización y filtros.
          </p>
        </div>

        {stationsError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error al leer stations: {stationsError.message}
          </div>
        ) : null}

        {reportsError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error al leer reports: {reportsError.message}
          </div>
        ) : null}

        {stations.length > 0 ? (
          <div className="mb-10">
            <ReportForm stations={stations} />
          </div>
        ) : (
          <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            No hay surtidores activos. Primero carga datos en la tabla stations.
          </div>
        )}

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Surtidores activos
          </h2>

          {stations.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
              No hay surtidores activos cargados en Supabase.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stations.map((station) => (
                <StationCard
                  key={station.id}
                  name={station.name}
                  zone={station.zone ?? "Sin zona"}
                  address={station.address}
                  latitude={station.latitude}
                  longitude={station.longitude}
                  latestReport={latestByStation.get(station.id) ?? null}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
