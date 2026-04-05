"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ReportForm } from "@/components/report-form";
import type { ReportInput, StationWithLatest } from "@/lib/types";
import {
  getFreshnessLabel,
  getSortDateValue,
  haversineKm,
  matchesFuelFilter,
  normalizeStatusForSort,
  queueSortValue,
} from "@/lib/utils";

const StationsMap = dynamic(() => import("@/components/stations-map"), {
  ssr: false,
});

type DashboardProps = {
  initialStations: StationWithLatest[];
  onSubmitReport: (input: ReportInput) => Promise<{ ok: boolean; message: string }>;
};

type SortMode = "recent" | "distance" | "availability" | "queue";

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
};

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Dashboard({ initialStations, onSubmitReport }: DashboardProps) {
  const [stations, setStations] = useState<StationWithLatest[]>(initialStations);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    initialStations[0]?.id ?? null
  );

  const [fuelFilter, setFuelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [onlyRecent, setOnlyRecent] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "granted" | "denied" | "error"
  >("idle");

  useEffect(() => {
    setStations(initialStations);
    if (!selectedStationId && initialStations[0]?.id) {
      setSelectedStationId(initialStations[0].id);
    }
  }, [initialStations, selectedStationId]);

  const zones = useMemo(() => {
    const unique = Array.from(
      new Set(
        initialStations
          .map((station) => station.zone?.trim())
          .filter((zone): zone is string => Boolean(zone))
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
    return unique;
  }, [initialStations]);

  const zoneOptions: [string, string][] = [
    ["all", "Todas"],
    ...zones.map((z) => [z, z] as [string, string]),
  ];

  const stationsWithDistance = useMemo(() => {
    return stations.map((station) => {
      let distanceKm: number | null = null;

      if (
        userLocation &&
        typeof station.latitude === "number" &&
        typeof station.longitude === "number"
      ) {
        distanceKm = haversineKm(
          userLocation.lat,
          userLocation.lng,
          station.latitude,
          station.longitude
        );
      }

      return {
        ...station,
        distanceKm,
      };
    });
  }, [stations, userLocation]);

  const filteredStations = useMemo(() => {
    const now = Date.now();

    const filtered = stationsWithDistance.filter((station) => {
      const latest = station.latestReport;

      if (zoneFilter !== "all" && (station.zone ?? "") !== zoneFilter) {
        return false;
      }

      if (fuelFilter !== "all" && !matchesFuelFilter(latest?.fuel_type, fuelFilter)) {
        return false;
      }

      if (statusFilter !== "all") {
        const status = latest?.availability_status ?? "sin_dato";
        if (status !== statusFilter) {
          return false;
        }
      }

      if (onlyRecent) {
        if (!latest?.created_at) {
          return false;
        }
        const ageMs = now - new Date(latest.created_at).getTime();
        if (ageMs > 90 * 60 * 1000) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "distance") {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      }

      if (sortMode === "availability") {
        const aStatus = normalizeStatusForSort(a.latestReport?.availability_status);
        const bStatus = normalizeStatusForSort(b.latestReport?.availability_status);
        if (aStatus !== bStatus) return aStatus - bStatus;
        return getSortDateValue(b.latestReport?.created_at) - getSortDateValue(a.latestReport?.created_at);
      }

      if (sortMode === "queue") {
        const aQueue = queueSortValue(a.latestReport?.queue_status);
        const bQueue = queueSortValue(b.latestReport?.queue_status);
        if (aQueue !== bQueue) return aQueue - bQueue;
        return getSortDateValue(b.latestReport?.created_at) - getSortDateValue(a.latestReport?.created_at);
      }

      return getSortDateValue(b.latestReport?.created_at) - getSortDateValue(a.latestReport?.created_at);
    });

    return sorted;
  }, [stationsWithDistance, zoneFilter, fuelFilter, statusFilter, onlyRecent, sortMode]);

  const selectedStation = useMemo(
    () => filteredStations.find((station) => station.id === selectedStationId) ?? filteredStations[0] ?? null,
    [filteredStations, selectedStationId]
  );

  useEffect(() => {
    if (selectedStation && selectedStation.id !== selectedStationId) {
      setSelectedStationId(selectedStation.id);
    }
  }, [selectedStation, selectedStationId]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("error");
      return;
    }

    setLocationState("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState("granted");
      },
      () => {
        setLocationState("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleSubmitReport = async (input: ReportInput) => {
    const result = await onSubmitReport(input);
    return result;
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Mapa de surtidores</h2>
                <p className="text-sm text-slate-500">
                  Visualiza surtidores, último estado reportado y ubicación relativa.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseMyLocation}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {locationState === "loading" ? "Ubicando..." : "Usar mi ubicación"}
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {locationState === "granted" && "Ubicación activada. Se muestran distancias aproximadas."}
              {locationState === "denied" && "Permiso de ubicación denegado. Puedes seguir usando la app."}
              {locationState === "error" && "Tu navegador no soporta geolocalización o hubo un error."}
              {locationState === "idle" && "La ubicación es opcional y no se guarda en la base de datos."}
            </div>
          </div>

          <div className="h-[420px]">
            <StationsMap
              stations={filteredStations}
              selectedStationId={selectedStation?.id ?? null}
              onSelectStation={(id) => setSelectedStationId(id)}
              userLocation={userLocation}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Reporte rápido</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra disponibilidad, fila y comentario del surtidor seleccionado.
          </p>

          <div className="mt-4">
            <ReportForm
              stations={stations}
              defaultStationId={selectedStation?.id ?? undefined}
              onSubmit={handleSubmitReport}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Combustible"
            value={fuelFilter}
            onChange={setFuelFilter}
            options={[
              ["all", "Todos"],
              ["especial", "Especial"],
              ["premium", "Premium"],
              ["diesel", "Diésel"],
            ]}
          />

          <Select
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              ["all", "Todos"],
              ["si_hay", "Sí hay"],
              ["no_hay", "No hay"],
              ["sin_dato", "Sin dato"],
            ]}
          />

          <Select
            label="Zona"
            value={zoneFilter}
            onChange={setZoneFilter}
            options={zoneOptions}
          />

          <Select
            label="Ordenar por"
            value={sortMode}
            onChange={(value) => setSortMode(value as SortMode)}
            options={[
              ["recent", "Más reciente"],
              ["distance", "Más cercano"],
              ["availability", "Disponibilidad"],
              ["queue", "Fila"],
            ]}
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyRecent}
              onChange={(e) => setOnlyRecent(e.target.checked)}
            />
            Solo recientes
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStations.map((station) => {
          const latest = station.latestReport;
          const freshness = getFreshnessLabel(latest?.created_at);
          const isSelected = selectedStation?.id === station.id;

          return (
            <button
              key={station.id}
              type="button"
              onClick={() => setSelectedStationId(station.id)}
              className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{station.name}</h3>
                  <p className={`text-sm ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {station.zone || "Sin zona"}
                  </p>
                </div>

                {station.distanceKm != null && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isSelected ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {station.distanceKm.toFixed(1)} km
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Dirección: </span>
                  <span>{station.address || "Sin dirección"}</span>
                </div>

                <div>
                  <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Combustible: </span>
                  <span>{latest?.fuel_type ?? "Sin dato"}</span>
                </div>

                <div>
                  <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Disponibilidad: </span>
                  <span>{latest?.availability_status ?? "sin_dato"}</span>
                </div>

                <div>
                  <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Fila: </span>
                  <span>{latest?.queue_status ?? "sin_dato"}</span>
                </div>

                <div>
                  <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Actualización: </span>
                  <span>{freshness}</span>
                </div>

                {latest?.comment && (
                  <div>
                    <span className={isSelected ? "text-slate-300" : "text-slate-500"}>Comentario: </span>
                    <span>{latest.comment}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
