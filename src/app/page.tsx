import { Dashboard } from "@/components/dashboard";
import { getSupabaseClient } from "@/lib/supabase";
import type { LatestReport, Station, StationWithLatest } from "@/lib/types";

export default async function HomePage() {
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

  if (stationsError || reportsError) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 md:px-6">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
          Error al leer Supabase:
          {" "}
          {stationsError?.message ?? reportsError?.message}
        </div>
      </main>
    );
  }

  const stations = (stationsData ?? []) as Station[];
  const reports = (reportsData ?? []) as LatestReport[];

  const latestMap = new Map<number, LatestReport>();
  for (const report of reports) {
    if (!latestMap.has(report.station_id)) {
      latestMap.set(report.station_id, report);
    }
  }

  const stationsWithLatest: StationWithLatest[] = stations.map((station) => ({
    ...station,
    latestReport: latestMap.get(station.id) ?? null,
  }));

  const zoneOptions = Array.from(
    new Set(stations.map((station) => station.zone).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <Dashboard
        stations={stationsWithLatest}
        allStations={stations}
        zoneOptions={zoneOptions}
      />
    </main>
  );
}
