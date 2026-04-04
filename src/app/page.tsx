import { supabase } from "@/lib/supabase";
import { StationCard } from "@/components/station-card";

type Station = {
  id: number;
  name: string;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

export default async function HomePage() {
  const { data, error } = await supabase
    .from("stations")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  const stations = (data ?? []) as Station[];

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
          <h2 className="text-xl font-semibold text-slate-900">
            Mapa / zona de reportes
          </h2>
          <p className="mt-2 text-slate-600">
            Aquí irá el mapa con surtidores, filtros y reportes en tiempo real.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Surtidores activos
          </h2>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              Error al leer Supabase: {error.message}
            </div>
          ) : stations.length === 0 ? (
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
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}