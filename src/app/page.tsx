import { Dashboard } from "@/components/dashboard";
import { getSupabaseClient } from "@/lib/supabase";
import { Report, Station, StationWithLatest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Faltan variables de entorno de Supabase.
        </div>
      </main>
    );
  }

  const [{ data: stationsData, error: stationsError }, { data: reportsData, error: reportsError }] =
    await Promise.all([
      supabase.from("stations").select("*").eq("is_active", true).order("name"),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ]);

  if (stationsError || reportsError) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error al leer Supabase. {stationsError?.message || reportsError?.message}
        </div>
      </main>
    );
  }

  const stations = (stationsData ?? []) as Station[];
  const reports = (reportsData ?? []) as Report[];

  const latestByStation = new Map<number, Report>();
  for (const report of reports) {
    if (!latestByStation.has(report.station_id)) latestByStation.set(report.station_id, report);
  }

  const stationsWithLatest: StationWithLatest[] = stations.map((station) => ({
    ...station,
    latestReport: latestByStation.get(station.id) ?? null,
  }));

  return <Dashboard initialStations={stationsWithLatest} reportCount={reports.length} />;
}
