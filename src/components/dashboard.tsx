"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RatingStars } from "@/components/rating-stars";
import { ReportForm } from "@/components/report-form";
import { trackAppEvent } from "@/lib/analytics";
import { buildTelHref, buildWhatsAppHref, formatContactLabel } from "@/lib/contact";
import {
  formatAvailability,
  formatFuelType,
  formatQueue,
  formatRelativeTime,
} from "@/lib/reporting";
import { getSupportServiceLabel } from "@/lib/services";
import type {
  Report,
  ReportInput,
  StationWithLatest,
  SupportService,
  SupportServiceCategory,
  SupportServiceWithDistance,
} from "@/lib/types";
import { haversineKm } from "@/lib/utils";

const StationsMap = dynamic(() => import("@/components/stations-map"), {
  ssr: false,
});

type DashboardProps = {
  initialStations: StationWithLatest[];
  initialServices: SupportService[];
  reportCount?: number;
};

type CategoryFilter = "all" | "stations" | SupportServiceCategory;

type SearchResult =
  | {
      key: string;
      kind: "station";
      distanceKm: number | null;
      searchRank: number;
      station: StationWithLatest & { distanceKm?: number | null };
    }
  | {
      key: string;
      kind: "service";
      distanceKm: number | null;
      searchRank: number;
      service: SupportServiceWithDistance;
    };

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function getStatusPillClass(status?: string | null) {
  switch (status) {
    case "si_hay":
      return "bg-emerald-100 text-emerald-700";
    case "no_hay":
      return "bg-rose-100 text-rose-700";
    case "sin_dato":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function getMatchRank(text: string, query: string, title: string) {
  if (!query) return 0;

  const normalizedTitle = normalizeSearchValue(title);
  if (normalizedTitle.startsWith(query)) return 3;
  if (normalizedTitle.includes(query)) return 2;
  if (text.includes(query)) return 1;
  return -1;
}

function normalizeExternalUrl(url?: string | null) {
  const trimmed = url?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function Dashboard({
  initialStations,
  initialServices,
  reportCount = 0,
}: DashboardProps) {
  const categoryFilter: CategoryFilter = "all";
  const [stations, setStations] = useState<StationWithLatest[]>(initialStations);
  const [services, setServices] = useState<SupportService[]>(initialServices);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "granted" | "denied" | "error"
  >("idle");
  const [didAutoPickNearest, setDidAutoPickNearest] = useState(false);
  const [requestedInitialLocation, setRequestedInitialLocation] = useState(false);

  useEffect(() => {
    setStations(initialStations);
  }, [initialStations]);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  useEffect(() => {
    trackAppEvent({
      eventType: "page_view_home",
      targetType: "system",
      metadata: {
        initial_services: initialServices.length,
        initial_stations: initialStations.length,
      },
    });
  }, [initialServices.length, initialStations.length]);

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

  const normalizedQuery = normalizeSearchValue(search);

  const results = useMemo<SearchResult[]>(() => {
    const stationResults: SearchResult[] =
      categoryFilter === "all" || categoryFilter === "stations"
        ? stationsWithDistance
            .map((station) => {
              const searchText = normalizeSearchValue(
                [
                  station.name,
                  station.zone,
                  station.city,
                  station.address,
                  station.latestReport?.comment,
                  station.latestReport?.fuel_type,
                  station.latestReport?.availability_status,
                ]
                  .filter(Boolean)
                  .join(" ")
              );

              const searchRank = getMatchRank(searchText, normalizedQuery, station.name);
              return {
                key: `station-${station.id}`,
                kind: "station" as const,
                distanceKm: station.distanceKm ?? null,
                searchRank,
                station,
              };
            })
            .filter((item) => !normalizedQuery || item.searchRank >= 0)
        : [];

    const serviceResults: SearchResult[] =
      categoryFilter !== "stations"
        ? servicesWithDistance
            .filter((service) =>
              categoryFilter === "all" ? true : service.category === categoryFilter
            )
            .map((service) => {
              const searchText = normalizeSearchValue(
                [
                  service.name,
                  service.zone,
                  service.city,
                  service.address,
                  service.description,
                  service.price_text,
                  service.meeting_point,
                  getSupportServiceLabel(service.category),
                ]
                  .filter(Boolean)
                  .join(" ")
              );

              const searchRank = getMatchRank(searchText, normalizedQuery, service.name);
              return {
                key: `service-${service.id}`,
                kind: "service" as const,
                distanceKm: service.distanceKm ?? null,
                searchRank,
                service,
              };
            })
            .filter((item) => !normalizedQuery || item.searchRank >= 0)
        : [];

    return [...stationResults, ...serviceResults].sort((a, b) => {
      if (normalizedQuery) {
        if (a.searchRank !== b.searchRank) return b.searchRank - a.searchRank;
      }

      const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      const aName = a.kind === "station" ? a.station.name : a.service.name;
      const bName = b.kind === "station" ? b.station.name : b.service.name;
      return aName.localeCompare(bName, "es");
    });
  }, [categoryFilter, normalizedQuery, servicesWithDistance, stationsWithDistance]);

  useEffect(() => {
    if (!selectedKey || !results.some((item) => item.key === selectedKey)) {
      setSelectedKey(results[0]?.key ?? null);
    }
  }, [results, selectedKey]);

  useEffect(() => {
    if (!userLocation || locationState !== "granted" || didAutoPickNearest) return;
    if (!results[0]) return;

    setSelectedKey(results[0].key);
    setDidAutoPickNearest(true);
  }, [didAutoPickNearest, locationState, results, userLocation]);

  useEffect(() => {
    setShowReportForm(false);
  }, [selectedKey]);

  const selectedResult = useMemo(
    () => results.find((item) => item.key === selectedKey) ?? null,
    [results, selectedKey]
  );

  const mapStations = useMemo(
    () => results.filter((item): item is Extract<SearchResult, { kind: "station" }> => item.kind === "station").map((item) => item.station),
    [results]
  );

  const mapServices = useMemo(
    () => results.filter((item): item is Extract<SearchResult, { kind: "service" }> => item.kind === "service").map((item) => item.service),
    [results]
  );

  const handleUseMyLocation = (options?: { silent?: boolean }) => {
    if (!navigator.geolocation) {
      setLocationState("error");
      return;
    }

    setLocationState("loading");
    setDidAutoPickNearest(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState("granted");
      },
      () => {
        setLocationState(options?.silent ? "idle" : "denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    if (requestedInitialLocation || typeof navigator === "undefined") return;
    setRequestedInitialLocation(true);
    handleUseMyLocation({ silent: true });
  }, [requestedInitialLocation]);

  const handleSelectResult = (
    key: string,
    source: "chip" | "map" | "popup"
  ) => {
    setSelectedKey(key);

    const item = results.find((candidate) => candidate.key === key);
    if (!item) return;

    trackAppEvent({
      eventType: source === "map" ? "map_select" : "result_select",
      targetId: item.kind === "station" ? item.station.id : item.service.id,
      targetName: item.kind === "station" ? item.station.name : item.service.name,
      targetType: item.kind,
      metadata: {
        source,
      },
    });
  };

  const handleRequestReportStation = (
    stationId: number,
    source: "detail" | "popup"
  ) => {
    const key = `station-${stationId}`;
    const station = stations.find((item) => item.id === stationId);
    setSelectedKey(key);
    setShowReportForm(true);
    trackAppEvent({
      eventType: "open_report_form",
      targetId: stationId,
      targetName: station?.name ?? null,
      targetType: "station",
      metadata: {
        source,
      },
    });
  };

  const trackServiceContact = (
    service: SupportService,
    eventType: "contact_whatsapp" | "contact_phone" | "open_service_link",
    source: "card" | "popup"
  ) => {
    trackAppEvent({
      eventType,
      targetId: service.id,
      targetName: service.name,
      targetType: "service",
      metadata: {
        category: service.category,
        source,
      },
    });
  };

  const handleSubmitReport = async (input: ReportInput) => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const json = (await res.json()) as { error?: string; report?: Report };
      if (!res.ok || !json.report) {
        throw new Error(json.error || "No se pudo enviar el reporte.");
      }

      setStations((current) =>
        current.map((station) =>
          station.id === input.station_id
            ? {
                ...station,
                latestReport: json.report ?? station.latestReport,
              }
            : station
        )
      );

      return {
        ok: true,
        message: "Reporte enviado.",
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo enviar el reporte.",
      };
    }
  };

  const quickResults = results.slice(0, 8);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              SurtiMapa
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Busca surtidores, talleres, gruas, auxilio y aditivos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {results.length} puntos visibles en mapa - {reportCount} reportes cargados
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar surtidor, taller, grua, auxilio o aditivos"
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <button
              type="button"
              onClick={() => handleUseMyLocation()}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {locationState === "loading" ? "Ubicando..." : "Usar mi ubicacion"}
            </button>
            <a
              href="/sumate"
              onClick={() =>
                trackAppEvent({
                  eventType: "open_vendor_join",
                  targetType: "vendor_request",
                })
              }
              className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
            >
              Quiero publicar
            </a>
          </div>

          <div className="text-xs text-slate-500">
            {locationState === "granted" && "Ubicacion activada. Se priorizan los puntos mas cercanos y el mapa toma tu zona actual."}
            {locationState === "denied" && "La ubicacion fue denegada. El mapa sigue funcionando."}
            {locationState === "error" && "No se pudo obtener tu ubicacion en este navegador."}
            {locationState === "idle" && "Busca o toca un marcador para ver estado, reputacion y contacto rapido."}
          </div>
        </div>
      </section>

      {quickResults.length > 0 ? (
        <section className="flex gap-2 overflow-x-auto pb-1">
          {quickResults.map((item) => {
            const title = item.kind === "station" ? item.station.name : item.service.name;
            const subtitle =
              item.kind === "station"
                ? item.station.zone || "Surtidor"
                : getSupportServiceLabel(item.service.category);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectResult(item.key, "chip")}
                className={`min-w-[150px] rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                  selectedKey === item.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                <div className="text-sm font-semibold">{title}</div>
                <div
                  className={`mt-1 text-xs ${
                    selectedKey === item.key ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {subtitle}
                </div>
              </button>
            );
          })}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-[58vh] min-h-[420px] sm:h-[70vh]">
          <StationsMap
            services={mapServices}
            stations={mapStations}
            selectedKey={selectedKey}
            onRequestReportStation={handleRequestReportStation}
            onSelectKey={(key) => handleSelectResult(key, "map")}
            userLocation={userLocation}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {!selectedResult ? (
          <div className="text-sm text-slate-500">
            No hay resultados para la busqueda actual.
          </div>
        ) : selectedResult.kind === "station" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Surtidor
                </span>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">
                  {selectedResult.station.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {[selectedResult.station.zone, selectedResult.station.city]
                    .filter(Boolean)
                    .join(" | ") || "Sin zona"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusPillClass(
                  selectedResult.station.latestReport?.availability_status
                )}`}
              >
                {formatAvailability(selectedResult.station.latestReport?.availability_status)}
              </span>
            </div>

            <RatingStars
              score={selectedResult.station.reputation_score}
              count={selectedResult.station.reputation_votes}
              size="md"
            />

            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Direccion</div>
                <div className="mt-2">{selectedResult.station.address || "Sin direccion"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Combustible</div>
                <div className="mt-2">
                  {formatFuelType(selectedResult.station.latestReport?.fuel_type)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Fila</div>
                <div className="mt-2">
                  {formatQueue(selectedResult.station.latestReport?.queue_status)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Actualizado</div>
                <div className="mt-2">
                  {formatRelativeTime(selectedResult.station.latestReport?.created_at)}
                </div>
              </div>
            </div>

            {selectedResult.station.latestReport?.comment ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                {selectedResult.station.latestReport.comment}
              </div>
            ) : null}

            {selectedResult.distanceKm != null ? (
              <div className="text-sm text-slate-500">
                Distancia aproximada: {formatDistance(selectedResult.distanceKm)}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => {
                  if (showReportForm) {
                    setShowReportForm(false);
                    return;
                  }
                  handleRequestReportStation(selectedResult.station.id, "detail");
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {showReportForm ? "Ocultar formulario" : "Informar estado o reportar"}
              </button>

              {showReportForm ? (
                <div className="mt-4">
                  <ReportForm
                    stations={stations}
                    defaultStationId={selectedResult.station.id}
                    onSubmit={handleSubmitReport}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {getSupportServiceLabel(selectedResult.service.category)}
                </span>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">
                  {selectedResult.service.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {[selectedResult.service.zone, selectedResult.service.city]
                    .filter(Boolean)
                    .join(" | ") || "Sin zona"}
                </p>
              </div>
              {selectedResult.distanceKm != null ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {formatDistance(selectedResult.distanceKm)}
                </span>
              ) : null}
            </div>

            <RatingStars
              score={selectedResult.service.rating_score}
              count={selectedResult.service.rating_count}
              size="md"
            />

            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Direccion</div>
                <div className="mt-2">{selectedResult.service.address || "Sin direccion"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Contacto</div>
                <div className="mt-2">
                  {formatContactLabel(
                    selectedResult.service.phone ?? selectedResult.service.whatsapp_number
                  )}
                </div>
              </div>
              {selectedResult.service.price_text ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Precio</div>
                  <div className="mt-2">{selectedResult.service.price_text}</div>
                </div>
              ) : null}
              {selectedResult.service.meeting_point ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Punto de encuentro
                  </div>
                  <div className="mt-2">{selectedResult.service.meeting_point}</div>
                </div>
              ) : null}
            </div>

            {selectedResult.service.description ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                {selectedResult.service.description}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {buildWhatsAppHref(
                selectedResult.service.whatsapp_number ?? selectedResult.service.phone
              ) ? (
                <a
                  href={buildWhatsAppHref(
                    selectedResult.service.whatsapp_number ?? selectedResult.service.phone
                  )}
                  onClick={() =>
                    trackServiceContact(selectedResult.service, "contact_whatsapp", "card")
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  WhatsApp
                </a>
              ) : null}

              {buildTelHref(
                selectedResult.service.phone ?? selectedResult.service.whatsapp_number
              ) ? (
                <a
                  href={buildTelHref(
                    selectedResult.service.phone ?? selectedResult.service.whatsapp_number
                  )}
                  onClick={() =>
                    trackServiceContact(selectedResult.service, "contact_phone", "card")
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Llamar
                </a>
              ) : null}

              {normalizeExternalUrl(selectedResult.service.website_url) ? (
                <a
                  href={normalizeExternalUrl(selectedResult.service.website_url)}
                  onClick={() =>
                    trackServiceContact(selectedResult.service, "open_service_link", "card")
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Abrir enlace
                </a>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
