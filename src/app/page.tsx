import { FilterBar } from "@/components/filter-bar";
import { MapShell } from "@/components/map-shell";
import { ReportForm } from "@/components/report-form";
import { StationCard } from "@/components/station-card";
import { getSupabaseClient } from "@/lib/supabase";
import type { LatestReport, Station, StationWithLatest } from "@/lib/types";

type SearchParams = Promise<{
  fuel?: string;
  availability?: string;
  zone?: string;
  recentOnly?: string;
}>;

function isRecent(createdAt?: string | null) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= 1000 * 60 * 60 * 4;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 md:px-6">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
          Faltan variables de entorno de Supabase en build o runtime.
        </div>
      </main>
    );
  }

  const [{ data: stationsData, error: stationsError }, { data: reportsData, error: reportsError }] =
    await Promise.all([
      supabase.from("stations").select("*").eq("is_active", true).order("name", { ascending: true }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ]);

  const stations = ((stationsData ?? []) as Station[]);
  const reports = ((reportsData ?? []) as LatestReport[]);

  const latestMap = new Map<number, LatestReport>();
  for (const report of reports) {
    if (!latestMap.has(report.station_id)) {
      latestMap.set(report.station_id, report);
    }
  }

  const zoneOptions = Array.from(
    new Set(stations.map((station) => station.zone).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  let stationsWithLatest: StationWithLatest[] = stations.map((station) => ({
    ...station,
    latestReport: latestMap.get(station.id) ?? null,
  }));

  if (params.fuel) {
    stationsWithLatest = stationsWithLatest.filter(
      (station) => station.latestReport?.fuel_type === params.fuel
    );
  }

  if (params.availability) {
    stationsWithLatest = stationsWithLatest.filter(
      (station) => station.latestReport?.availability_status === params.availability
    );
  }

  if (params.zone) {
    stationsWithLatest = stationsWithLatest.filter(
      (station) => station.zone === params.zone
    );
  }

  if (params.recentOnly === "on") {
    stationsWithLatest = stationsWithLatest.filter((station) =>
      isRecent(station.latestReport?.created_at)
    );
  }

  const reportCount = reports.length;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              SurtiMapa
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Mapa activo
            </span>
          </div>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Estado colaborativo de surtidores y filas en La Paz
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
            Consulta rápido qué surtidor tiene reportes recientes, registra disponibilidad de combustible
            y usa el mapa para ubicar opciones cercanas con una lectura visual más útil.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Surtidores visibles</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stationsWithLatest.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Reportes cargados</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{reportCount}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Con coordenadas</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {stationsWithLatest.filter((s) => s.latitude != null && s.longitude != null).length}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Mapa / zona de reportes</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ahora ya puedes ver pines por estado. El siguiente paso será geolocalización y ordenar por cercanía.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700">Sí hay</span>
            <span className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">No hay</span>
            <span className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-700">Sin dato</span>
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            El mapa usa OpenStreetMap + Leaflet. Puedes hacer clic en los pines para ver el último estado de cada surtidor.
          </div>
        </div>
      </section>

      <div className="mt-6">
        <MapShell stations={stationsWithLatest} />
      </div>

      <div className="mt-6">
        <FilterBar zoneOptions={zoneOptions} />
      </div>

      <div className="mt-6">
        <ReportForm stations={stations} />
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-slate-900">Surtidores activos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Último reporte visible por estación para tomar decisiones rápidas.
          </p>
        </div>

        {stationsError || reportsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {stationsError?.message ?? reportsError?.message}
          </div>
        ) : stationsWithLatest.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
            No hay surtidores que coincidan con los filtros actuales.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stationsWithLatest.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
