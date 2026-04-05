"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ReportForm } from "@/components/report-form";
import { SupportServiceCard } from "@/components/support-service-card";
import { SUPPORT_SERVICE_OPTIONS, getSupportServiceLabel } from "@/lib/services";
import type {
  ReportInput,
  StationWithLatest,
  SupportService,
  SupportServiceWithDistance,
} from "@/lib/types";
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
  initialServices: SupportService[];
  reportCount?: number;
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

export function Dashboard({
  initialStations,
  initialServices,
  reportCount = 0,
}: DashboardProps) {
  const [stations, setStations] = useState<StationWithLatest[]>(initialStations);
  const [services, setServices] = useState<SupportService[]>(initialServices);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    initialStations[0]?.id ?? null
  );

  const [fuelFilter, setFuelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");
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

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const zones = useMemo(() => {
    const unique = Array.from(
      new Set(
        [...initialStations.map((station) => station.zone?.trim()), ...initialServices.map((service) => service.zone?.trim())]
          .filter((zone): zone is string => Boolean(zone))
      )
    ).sort((a, b) => a.localeCompare(b, "es"));

    return unique;
  }, [initialStations, initialServices]);

  const zoneOptions: [string, string][] = [
    ["all", "Todas"],
    ...zones.map((zone) => [zone, zone] as [string, string]),
  ];

  const serviceCategoryOptions: [string, string][] = [
    ["all", "Todos"],
    ...SUPPORT_SERVICE_OPTIONS.map((option) => [option.value, option.label] as [string, string]),
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

  const servicesWithDistance = useMemo<SupportServiceWithDistance[]>(() => {
    return services.map((service) => {
      let distanceKm: number | null = null;

      if (
        userLocation &&
        typeof service.latitude === "number" &&
        typeof service.longitude === "number"
      ) {
        distanceKm = haversineKm(
          userLocation.lat,
          userLocation.lng,
          service.latitude,
          service.longitude
        );
      }

      return {
        ...service,
        distanceKm,
      };
    });
  }, [services, userLocation]);

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

    return [...filtered].sort((a, b) => {
      if (sortMode === "distance") {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      }

      if (sortMode === "availability") {
        const aStatus = normalizeStatusForSort(a.latestReport?.availability_status);
        const bStatus = normalizeStatusForSort(b.latestReport?.availability_status);
        if (aStatus !== bStatus) return aStatus - bStatus;
        return (
          getSortDateValue(b.latestReport?.created_at) -
          getSortDateValue(a.latestReport?.created_at)
        );
      }

      if (sortMode === "queue") {
        const aQueue = queueSortValue(a.latestReport?.queue_status);
        const bQueue = queueSortValue(b.latestReport?.queue_status);
        if (aQueue !== bQueue) return aQueue - bQueue;
        return (
          getSortDateValue(b.latestReport?.created_at) -
          getSortDateValue(a.latestReport?.created_at)
        );
      }

      return (
        getSortDateValue(b.latestReport?.created_at) -
        getSortDateValue(a.latestReport?.created_at)
      );
    });
  }, [stationsWithDistance, zoneFilter, fuelFilter, statusFilter, onlyRecent, sortMode]);

  const filteredServices = useMemo(() => {
    const filtered = servicesWithDistance.filter((service) => {
      if (zoneFilter !== "all" && (service.zone ?? "") !== zoneFilter) {
        return false;
      }

      if (serviceCategoryFilter !== "all" && service.category !== serviceCategoryFilter) {
        return false;
      }

      return service.is_active !== false;
    });

    return [...filtered].sort((a, b) => {
      const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      const categoryCompare = getSupportServiceLabel(a.category).localeCompare(
        getSupportServiceLabel(b.category),
        "es"
      );
      if (categoryCompare !== 0) return categoryCompare;

      return a.name.localeCompare(b.name, "es");
    });
  }, [servicesWithDistance, zoneFilter, serviceCategoryFilter]);

  const selectedStation = useMemo(
    () =>
      filteredStations.find((station) => station.id === selectedStationId) ??
      filteredStations[0] ??
      null,
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

  const handleSubmitReport = async (_input: ReportInput) => {
    return {
      ok: true,
      message: "Reporte enviado",
    };
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Surtidores</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stations.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Servicios de auxilio</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{services.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Reportes</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{reportCount}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Ubicacion</div>
          <div className="mt-2 text-sm font-medium text-slate-900">
            {locationState === "granted"
              ? "Activa"
              : locationState === "loading"
                ? "Buscando..."
                : "No activada"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Mapa de surtidores y auxilio
                </h2>
                <p className="text-sm text-slate-500">
                  Visualiza surtidores, talleres, gruas, servicio mecanico y venta de
                  aditivos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseMyLocation}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {locationState === "loading" ? "Ubicando..." : "Usar mi ubicacion"}
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {locationState === "granted" &&
                "Ubicacion activada. Se muestran distancias aproximadas."}
              {locationState === "denied" &&
                "Permiso de ubicacion denegado. Puedes seguir usando la app."}
              {locationState === "error" &&
                "Tu navegador no soporta geolocalizacion o hubo un error."}
              {locationState === "idle" &&
                "La ubicacion es opcional y no se guarda en la base de datos."}
            </div>
          </div>

          <div className="h-[420px]">
            <StationsMap
              services={filteredServices}
              stations={filteredStations}
              selectedStationId={selectedStation?.id ?? null}
              onSelectStation={(id) => setSelectedStationId(id)}
              userLocation={userLocation}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Reporte rapido</h2>
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
              ["diesel", "Diesel"],
            ]}
          />

          <Select
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              ["all", "Todos"],
              ["si_hay", "Si hay"],
              ["no_hay", "No hay"],
              ["sin_dato", "Sin dato"],
            ]}
          />

          <Select label="Zona" value={zoneFilter} onChange={setZoneFilter} options={zoneOptions} />

          <Select
            label="Tipo de servicio"
            value={serviceCategoryFilter}
            onChange={setServiceCategoryFilter}
            options={serviceCategoryOptions}
          />

          <Select
            label="Ordenar surtidores"
            value={sortMode}
            onChange={(value) => setSortMode(value as SortMode)}
            options={[
              ["recent", "Mas reciente"],
              ["distance", "Mas cercano"],
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Auxilio y servicios</h2>
            <p className="text-sm text-slate-500">
              Contacta talleres, gruas o soporte mecanico directo desde la app.
            </p>
          </div>
          <div className="text-sm text-slate-500">{filteredServices.length} resultados</div>
        </div>

        {filteredServices.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((service) => (
              <SupportServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            No hay servicios de auxilio para los filtros seleccionados.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Surtidores</h2>
          <p className="text-sm text-slate-500">
            Selecciona un surtidor para reportar o revisar su ultimo estado.
          </p>
        </div>

        {filteredStations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                      <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                        Direccion:{" "}
                      </span>
                      <span>{station.address || "Sin direccion"}</span>
                    </div>

                    <div>
                      <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                        Combustible:{" "}
                      </span>
                      <span>{latest?.fuel_type ?? "Sin dato"}</span>
                    </div>

                    <div>
                      <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                        Disponibilidad:{" "}
                      </span>
                      <span>{latest?.availability_status ?? "sin_dato"}</span>
                    </div>

                    <div>
                      <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                        Fila:{" "}
                      </span>
                      <span>{latest?.queue_status ?? "sin_dato"}</span>
                    </div>

                    <div>
                      <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                        Actualizacion:{" "}
                      </span>
                      <span>{freshness}</span>
                    </div>

                    {latest?.comment && (
                      <div>
                        <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                          Comentario:{" "}
                        </span>
                        <span>{latest.comment}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            No hay surtidores que coincidan con los filtros seleccionados.
          </div>
        )}
      </section>
    </div>
  );
}
