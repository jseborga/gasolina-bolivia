"use client";

import { useMemo, useState } from "react";
import { StationWithLatest, FuelType, AvailabilityStatus, QueueStatus, Report } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { getFreshness } from "@/lib/reporting";
import { MapSection } from "@/components/map/map-section";
import { ReportForm } from "@/components/report-form";
import { StationCard } from "@/components/station-card";

type SortMode = "recent" | "distance" | "available_first" | "short_queue";

export function Dashboard({
  initialStations,
  reportCount,
}: {
  initialStations: StationWithLatest[];
  reportCount: number;
}) {
  const [stations, setStations] = useState(initialStations);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState<"all" | FuelType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AvailabilityStatus>("all");
  const [onlyRecent, setOnlyRecent] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

  const zones = useMemo(
    () => Array.from(new Set(stations.map((station) => station.zone).filter(Boolean) as string[])).sort(),
    [stations]
  );

  const enriched = useMemo(() => {
    return stations.map((station) => {
      const latest = station.latestReport;
      const distanceKm =
        userLocation && station.latitude != null && station.longitude != null
          ? haversineKm(userLocation, { latitude: station.latitude, longitude: station.longitude })
          : null;

      const freshness = latest ? getFreshness(latest.created_at) : null;
      const recent = latest ? freshness?.label !== "Desactualizado" : false;

      return { ...station, distanceKm, freshness, isRecent: recent };
    });
  }, [stations, userLocation]);

  const filteredStations = useMemo(() => {
    const filtered = enriched.filter((station) => {
      if (zoneFilter !== "all" && station.zone !== zoneFilter) return false;
      if (fuelFilter !== "all" && station.latestReport?.fuel_type !== fuelFilter) return false;
      if (statusFilter !== "all" && station.latestReport?.availability_status !== statusFilter) return false;
      if (onlyRecent && !station.isRecent) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "distance") {
        const av = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const bv = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return av - bv;
      }

      if (sortMode === "available_first") {
        const order = (value: AvailabilityStatus | undefined) =>
          value === "si_hay" ? 0 : value === "sin_dato" ? 1 : 2;
        return order(a.latestReport?.availability_status) - order(b.latestReport?.availability_status);
      }

      if (sortMode === "short_queue") {
        const order = (value: QueueStatus | undefined) =>
          value === "corta" ? 0 : value === "media" ? 1 : value === "sin_dato" ? 2 : 3;
        return order(a.latestReport?.queue_status) - order(b.latestReport?.queue_status);
      }

      const at = a.latestReport ? new Date(a.latestReport.created_at).getTime() : 0;
      const bt = b.latestReport ? new Date(b.latestReport.created_at).getTime() : 0;
      return bt - at;
    });
  }, [enriched, fuelFilter, onlyRecent, sortMode, statusFilter, zoneFilter]);

  const activateLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no soporta ubicación.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMessage("Ubicación activada.");
      },
      () => setLocationMessage("Puedes seguir usando la app sin ubicación."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const recentCount = filteredStations.filter((station) => station.isRecent).length;
  const availableCount = filteredStations.filter((station) => station.latestReport?.availability_status === "si_hay").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-300">SurtiMapa V9.1</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Combustible, filas y cercanía en una sola vista.</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Revisa surtidores activos, reporta disponibilidad y ordena por cercanía, frescura del dato y estado de fila.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Surtidores" value={stations.length.toString()} />
            <MetricCard label="Reportes" value={reportCount.toString()} />
            <MetricCard label="Recientes" value={recentCount.toString()} />
            <MetricCard label="Sí hay" value={availableCount.toString()} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Mapa en vivo</h2>
                <p className="text-sm text-slate-600">El mapa se centra en tu posición si activas la ubicación.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={activateLocation} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Usar mi ubicación
                </button>
                {locationMessage ? <span className="self-center text-sm text-slate-600">{locationMessage}</span> : null}
              </div>
            </div>
            <div className="mt-4 h-[360px] overflow-hidden rounded-2xl border border-slate-200">
              <MapSection stations={filteredStations} userLocation={userLocation} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Filtros inteligentes</h2>
                <p className="text-sm text-slate-600">Ordena por cercanía, recencia o prioriza surtidores con disponibilidad.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Select label="Zona" value={zoneFilter} onChange={setZoneFilter} options={[["all","Todas"], ...zones.map((z) => [z, z])]} />
                <Select label="Combustible" value={fuelFilter} onChange={(v) => setFuelFilter(v as "all" | FuelType)} options={[["all","Todos"],["especial","Especial"],["premium","Premium"],["diesel","Diésel"]]} />
                <Select label="Estado" value={statusFilter} onChange={(v) => setStatusFilter(v as "all" | AvailabilityStatus)} options={[["all","Todos"],["si_hay","Sí hay"],["no_hay","No hay"],["sin_dato","Sin dato"]]} />
                <Select label="Ordenar por" value={sortMode} onChange={(v) => setSortMode(v as SortMode)} options={[["recent","Más reciente"],["distance","Más cerca"],["available_first","Sí hay primero"],["short_queue","Fila más corta"]]} />
              </div>
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={onlyRecent} onChange={(e) => setOnlyRecent(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Mostrar solo reportes recientes
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredStations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <ReportForm
            stations={stations}
            onCreated={(newReport: Report) => {
              setStations((prev) =>
                prev.map((station) =>
                  station.id === newReport.station_id ? { ...station, latestReport: newReport } : station
                )
              );
            }}
          />
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Cómo usarla mejor</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Activa tu ubicación solo si quieres ordenar por cercanía.</li>
              <li>• “Reciente” significa reporte de hasta 30 minutos.</li>
              <li>• “Todavía útil” llega hasta 90 minutos.</li>
              <li>• Si no hay reportes nuevos, el sistema muestra el último dato disponible.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][]; }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500">
        {options.map(([key, labelValue]) => <option key={key} value={key}>{labelValue}</option>)}
      </select>
    </label>
  );
}
