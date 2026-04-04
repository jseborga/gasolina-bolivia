"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { MapShell } from "@/components/map-shell";
import { ReportForm } from "@/components/report-form";
import { StationCard } from "@/components/station-card";
import { distanceFromUser } from "@/lib/geo";
import { getFreshness } from "@/lib/reporting";
import type { Station, StationWithLatest, UserLocation } from "@/lib/types";

type Props = {
  stations: StationWithLatest[];
  allStations: Station[];
  zoneOptions: string[];
};

type SortMode = "recent" | "near" | "available" | "short_queue" | "name";

function queueRank(value?: string | null) {
  if (value === "corta") return 0;
  if (value === "media") return 1;
  if (value === "larga") return 2;
  return 3;
}

function reportTimeValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function Dashboard({ stations, allStations, zoneOptions }: Props) {
  const [fuel, setFuel] = useState("");
  const [availability, setAvailability] = useState("");
  const [zone, setZone] = useState("");
  const [recentOnly, setRecentOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "denied" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const distances = useMemo(() => {
    return Object.fromEntries(
      stations.map((station) => [
        station.id,
        distanceFromUser(userLocation, station.latitude, station.longitude),
      ])
    ) as Record<number, number | null>;
  }, [stations, userLocation]);

  const visibleStations = useMemo(() => {
    let result = [...stations];

    if (fuel) {
      result = result.filter((station) => station.latestReport?.fuel_type === fuel);
    }

    if (availability) {
      result = result.filter(
        (station) => station.latestReport?.availability_status === availability
      );
    }

    if (zone) {
      result = result.filter((station) => station.zone === zone);
    }

    if (recentOnly) {
      result = result.filter(
        (station) => getFreshness(station.latestReport?.created_at).tone === "fresh"
      );
    }

    result.sort((a, b) => {
      if (sortMode === "recent") {
        return reportTimeValue(b.latestReport?.created_at) - reportTimeValue(a.latestReport?.created_at);
      }

      if (sortMode === "near") {
        const aDistance = distances[a.id] ?? Number.POSITIVE_INFINITY;
        const bDistance = distances[b.id] ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      }

      if (sortMode === "available") {
        const aRank = a.latestReport?.availability_status === "si_hay" ? 0 : a.latestReport?.availability_status === "sin_dato" ? 1 : 2;
        const bRank = b.latestReport?.availability_status === "si_hay" ? 0 : b.latestReport?.availability_status === "sin_dato" ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        return reportTimeValue(b.latestReport?.created_at) - reportTimeValue(a.latestReport?.created_at);
      }

      if (sortMode === "short_queue") {
        const aRank = queueRank(a.latestReport?.queue_status);
        const bRank = queueRank(b.latestReport?.queue_status);
        if (aRank !== bRank) return aRank - bRank;
        return reportTimeValue(b.latestReport?.created_at) - reportTimeValue(a.latestReport?.created_at);
      }

      return a.name.localeCompare(b.name);
    });

    return result;
  }, [availability, distances, fuel, recentOnly, sortMode, stations, zone]);

  async function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage("Este navegador no soporta geolocalización.");
      return;
    }

    setLocationStatus("loading");
    setLocationMessage("Buscando tu ubicación...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("ready");
        setLocationMessage("Ubicación activada. Ahora ves distancias y orden por cercanía.");
        setSortMode("near");
      },
      () => {
        setLocationStatus("denied");
        setLocationMessage("No se pudo usar tu ubicación. Puedes seguir usando la app normalmente.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  function clearAll() {
    setFuel("");
    setAvailability("");
    setZone("");
    setRecentOnly(false);
    setSortMode(userLocation ? "near" : "recent");
  }

  const stationsWithCoords = stations.filter(
    (station) => station.latitude != null && station.longitude != null
  ).length;

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              SurtiMapa
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              V9 en marcha
            </span>
          </div>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Estado colaborativo de surtidores y filas en La Paz
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
            Consulta rápido qué surtidor tiene reportes recientes, usa ubicación opcional para ver distancias
            y prioriza opciones cercanas con una lectura más útil en calle.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Surtidores visibles
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{visibleStations.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Reportes recientes
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {visibleStations.filter((station) => getFreshness(station.latestReport?.created_at).tone === "fresh").length}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Con coordenadas
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stationsWithCoords}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Ubicación y prioridad</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Activa tu ubicación para ordenar por cercanía y ver la distancia aproximada a cada surtidor.
            La app sigue funcionando igual si no compartes tu ubicación.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationStatus === "loading"}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locationStatus === "loading" ? "Buscando ubicación..." : "Usar mi ubicación"}
            </button>

            {userLocation && (
              <button
                type="button"
                onClick={() => {
                  setUserLocation(null);
                  setLocationStatus("idle");
                  setLocationMessage("Ubicación desactivada. La app sigue operativa.");
                  setSortMode("recent");
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Quitar ubicación
              </button>
            )}
          </div>

          {locationMessage && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {locationMessage}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Orden actual
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {sortMode === "near"
                  ? "Más cercanos"
                  : sortMode === "recent"
                    ? "Más recientes"
                    : sortMode === "available"
                      ? "Sí hay primero"
                      : sortMode === "short_queue"
                        ? "Fila más corta"
                        : "Nombre"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Estado ubicación
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {locationStatus === "ready"
                  ? "Ubicación activa"
                  : locationStatus === "loading"
                    ? "Buscando..."
                    : locationStatus === "denied"
                      ? "Permiso denegado"
                      : locationStatus === "error"
                        ? "No disponible"
                        : "No activada"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <MapShell stations={visibleStations} userLocation={userLocation} distances={distances} />
      </section>

      <section className="mt-6">
        <FilterBar
          zoneOptions={zoneOptions}
          fuel={fuel}
          availability={availability}
          zone={zone}
          recentOnly={recentOnly}
          sortMode={sortMode}
          onFuelChange={setFuel}
          onAvailabilityChange={setAvailability}
          onZoneChange={setZone}
          onRecentOnlyChange={setRecentOnly}
          onSortModeChange={(value) => setSortMode(value as SortMode)}
          onReset={clearAll}
        />
      </section>

      <section className="mt-6">
        <ReportForm stations={allStations} />
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Surtidores visibles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordenados según tu criterio actual, con recencia y distancia opcional.
            </p>
          </div>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {visibleStations.length} resultados
          </div>
        </div>

        {visibleStations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No hay surtidores que coincidan con los filtros actuales.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                distanceKm={distances[station.id]}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
