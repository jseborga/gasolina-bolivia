"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RatingStars } from "@/components/rating-stars";
import { ReportForm } from "@/components/report-form";
import { ensureVisitorId, trackAppEvent } from "@/lib/analytics";
import type { ServiceAdminInput } from "@/lib/admin-service-types";
import type { StationAdminInput } from "@/lib/admin-types";
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
  SupportServiceCategory,
  SupportService,
  SupportServiceWithDistance,
  TrafficIncident,
} from "@/lib/types";
import { haversineKm } from "@/lib/utils";

const StationsMap = dynamic(() => import("@/components/stations-map"), {
  ssr: false,
});

type DashboardProps = {
  adminSession?: { email: string } | null;
  initialStations: StationWithLatest[];
  initialServices: SupportService[];
  initialTrafficIncidents: TrafficIncident[];
  reportCount?: number;
};

type StationMapAdminDraft = {
  address: string;
  city: string;
  is_active: boolean;
  is_verified: boolean;
  latitude: string;
  longitude: string;
  name: string;
  zone: string;
};

type ServiceMapAdminDraft = {
  address: string;
  category: SupportServiceCategory;
  city: string;
  description: string;
  is_active: boolean;
  is_published: boolean;
  is_verified: boolean;
  latitude: string;
  longitude: string;
  meeting_point: string;
  name: string;
  phone: string;
  price_text: string;
  website_url: string;
  whatsapp_number: string;
  zone: string;
};

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

type PublicMapFilter = "stations" | "servicio_mecanico" | "none";
type IncidentMapFilter =
  | "all"
  | "nearby"
  | "none"
  | "control_vial"
  | "corte_via"
  | "marcha"
  | "accidente"
  | "derrumbe"
  | "otro";

const INCIDENT_FILTER_OPTIONS: ReadonlyArray<readonly [IncidentMapFilter, string]> = [
  ["all", "Todos"],
  ["nearby", "Cerca"],
  ["control_vial", "Control"],
  ["corte_via", "Corte"],
  ["marcha", "Marcha"],
  ["accidente", "Accidente"],
  ["derrumbe", "Derrumbe"],
  ["none", "Ocultar"],
];

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toLocationAnalyticsMetadata(input: { lat: number; lng: number; accuracy?: number | null }) {
  return {
    accuracy_meters:
      typeof input.accuracy === "number" && Number.isFinite(input.accuracy)
        ? Math.round(input.accuracy)
        : null,
    lat: Number(input.lat.toFixed(4)),
    lng: Number(input.lng.toFixed(4)),
  };
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function getIncidentTypeLabel(
  type: "control_vial" | "corte_via" | "marcha" | "accidente" | "derrumbe" | "otro"
) {
  switch (type) {
    case "control_vial":
      return "Control";
    case "corte_via":
      return "Corte";
    case "marcha":
      return "Marcha";
    case "accidente":
      return "Accidente";
    case "derrumbe":
      return "Derrumbe";
    case "otro":
    default:
      return "Otro";
  }
}

function getIncidentAlertMeta(
  type: "control_vial" | "corte_via" | "marcha" | "accidente" | "derrumbe" | "otro"
) {
  switch (type) {
    case "control_vial":
      return {
        icon: "👮",
        badgeClass: "bg-sky-600 text-white",
        cardClass: "border-sky-300 bg-sky-50/95 text-sky-900",
        title: "Control policial cerca",
      };
    case "corte_via":
      return {
        icon: "⛔",
        badgeClass: "bg-orange-500 text-white",
        cardClass: "border-orange-300 bg-orange-50/95 text-orange-900",
        title: "Corte de via cerca",
      };
    case "marcha":
      return {
        icon: "📣",
        badgeClass: "bg-fuchsia-600 text-white",
        cardClass: "border-fuchsia-300 bg-fuchsia-50/95 text-fuchsia-900",
        title: "Marcha cerca",
      };
    case "accidente":
      return {
        icon: "⚠️",
        badgeClass: "bg-rose-600 text-white",
        cardClass: "border-rose-300 bg-rose-50/95 text-rose-900",
        title: "Accidente cerca",
      };
    case "derrumbe":
      return {
        icon: "🪨",
        badgeClass: "bg-amber-700 text-white",
        cardClass: "border-amber-300 bg-amber-50/95 text-amber-900",
        title: "Derrumbe cerca",
      };
    case "otro":
    default:
      return {
        icon: "🚨",
        badgeClass: "bg-slate-700 text-white",
        cardClass: "border-slate-300 bg-white/95 text-slate-900",
        title: "Incidente cerca",
      };
  }
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

function formatCoordinateInput(value?: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "";
}

function parseCoordinateInput(value: string, label: "latitud" | "longitud") {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`La ${label} no es valida.`);
  }

  return parsed;
}

function createStationAdminDraft(station: StationWithLatest): StationMapAdminDraft {
  return {
    address: station.address ?? "",
    city: station.city ?? "",
    is_active: station.is_active ?? true,
    is_verified: station.is_verified ?? false,
    latitude: formatCoordinateInput(station.latitude),
    longitude: formatCoordinateInput(station.longitude),
    name: station.name,
    zone: station.zone ?? "",
  };
}

function createServiceAdminDraft(service: SupportService): ServiceMapAdminDraft {
  return {
    address: service.address ?? "",
    category: service.category,
    city: service.city ?? "",
    description: service.description ?? "",
    is_active: service.is_active ?? true,
    is_published: service.is_published ?? false,
    is_verified: service.is_verified ?? false,
    latitude: formatCoordinateInput(service.latitude),
    longitude: formatCoordinateInput(service.longitude),
    meeting_point: service.meeting_point ?? "",
    name: service.name,
    phone: service.phone ?? "",
    price_text: service.price_text ?? "",
    website_url: service.website_url ?? "",
    whatsapp_number: service.whatsapp_number ?? "",
    zone: service.zone ?? "",
  };
}

function buildStationAdminPayload(
  station: StationWithLatest,
  draft: StationMapAdminDraft
): StationAdminInput {
  return {
    address: draft.address,
    city: draft.city,
    fuel_diesel: station.fuel_diesel ?? false,
    fuel_especial: station.fuel_especial ?? false,
    fuel_gnv: station.fuel_gnv ?? false,
    fuel_premium: station.fuel_premium ?? false,
    is_active: draft.is_active,
    is_verified: draft.is_verified,
    latitude: parseCoordinateInput(draft.latitude, "latitud"),
    license_code: station.license_code ?? undefined,
    longitude: parseCoordinateInput(draft.longitude, "longitud"),
    name: draft.name,
    notes: station.notes ?? undefined,
    reputation_score: station.reputation_score ?? 0,
    reputation_votes: station.reputation_votes ?? 0,
    source_url: station.source_url ?? undefined,
    zone: draft.zone,
  };
}

function buildServiceAdminPayload(
  service: SupportService,
  draft: ServiceMapAdminDraft
): ServiceAdminInput {
  return {
    address: draft.address,
    category: draft.category,
    city: draft.city,
    description: draft.description,
    is_active: draft.is_active,
    is_published: draft.is_published,
    is_verified: draft.is_verified,
    latitude: parseCoordinateInput(draft.latitude, "latitud"),
    longitude: parseCoordinateInput(draft.longitude, "longitud"),
    meeting_point: draft.meeting_point,
    name: draft.name,
    notes: service.notes ?? undefined,
    phone: draft.phone,
    price_text: draft.price_text,
    rating_count: service.rating_count ?? 0,
    rating_score: service.rating_score ?? 0,
    source_url: service.source_url ?? undefined,
    website_url: draft.website_url,
    whatsapp_number: draft.whatsapp_number,
    zone: draft.zone,
  };
}

export function Dashboard({
  adminSession = null,
  initialTrafficIncidents,
  initialStations,
  initialServices,
  reportCount = 0,
}: DashboardProps) {
  const isAdminMode = Boolean(adminSession);
  const [stations, setStations] = useState<StationWithLatest[]>(initialStations);
  const [services, setServices] = useState<SupportService[]>(initialServices);
  const [trafficIncidents, setTrafficIncidents] =
    useState<TrafficIncident[]>(initialTrafficIncidents);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "loading" | "granted" | "denied" | "error"
  >("idle");
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [locationFocusKey, setLocationFocusKey] = useState(0);
  const [showHomeGuide, setShowHomeGuide] = useState(false);
  const [publicMapFilter, setPublicMapFilter] = useState<PublicMapFilter>("stations");
  const [incidentMapFilter, setIncidentMapFilter] = useState<IncidentMapFilter>("all");
  const [showIncidentFilters, setShowIncidentFilters] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [incidentReportMode, setIncidentReportMode] = useState(false);
  const [hasIncidentDraftPoint, setHasIncidentDraftPoint] = useState(false);
  const [stationAdminDraft, setStationAdminDraft] = useState<StationMapAdminDraft | null>(null);
  const [serviceAdminDraft, setServiceAdminDraft] = useState<ServiceMapAdminDraft | null>(null);
  const [adminActionKey, setAdminActionKey] = useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const detailSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setStations(initialStations);
  }, [initialStations]);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  useEffect(() => {
    setTrafficIncidents(initialTrafficIncidents);
  }, [initialTrafficIncidents]);

  useEffect(() => {
    trackAppEvent({
      eventType: "page_view_home",
      targetType: "system",
      metadata: {
        initial_incidents: initialTrafficIncidents.length,
        initial_services: initialServices.length,
        initial_stations: initialStations.length,
      },
    });
  }, [initialServices.length, initialStations.length, initialTrafficIncidents.length]);

  useEffect(() => {
    if (isAdminMode || typeof window === "undefined") {
      return;
    }

    const guideDismissed = window.localStorage.getItem("surtimapa-home-guide-dismissed");
    setShowHomeGuide(guideDismissed !== "1");
  }, [isAdminMode]);

  const stationsWithDistance = useMemo(() => {
    return stations.map((station) => {
      let distanceKm: number | null = null;

      if (
        userLocation &&
        !isAdminMode &&
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
  }, [isAdminMode, stations, userLocation]);

  const servicesWithDistance = useMemo<SupportServiceWithDistance[]>(() => {
    return services.map((service) => {
      let distanceKm: number | null = null;

      if (
        userLocation &&
        !isAdminMode &&
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
  }, [isAdminMode, services, userLocation]);

  const normalizedQuery = normalizeSearchValue(search);

  const results = useMemo<SearchResult[]>(() => {
    const showStations = isAdminMode || publicMapFilter === "stations";
    const showServices = isAdminMode || publicMapFilter === "servicio_mecanico";

    const stationResults: SearchResult[] = showStations
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

    const serviceResults: SearchResult[] = showServices
      ? servicesWithDistance
          .filter((service) =>
            isAdminMode
              ? true
              : publicMapFilter === "servicio_mecanico"
                ? service.category === "servicio_mecanico"
                : true
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
  }, [isAdminMode, normalizedQuery, publicMapFilter, servicesWithDistance, stationsWithDistance]);

  useEffect(() => {
    const hasSelected = selectedKey
      ? results.some((item) => item.key === selectedKey)
      : false;

    if (hasSelected) {
      return;
    }

    if (isAdminMode) {
      if (selectedKey !== null) {
        setSelectedKey(null);
      }
      return;
    }

    if (selectedKey !== null) {
      setSelectedKey(null);
    }
  }, [isAdminMode, results, selectedKey]);

  useEffect(() => {
    setShowReportForm(false);
  }, [selectedKey]);

  useEffect(() => {
    if (!incidentReportMode && hasIncidentDraftPoint) {
      setHasIncidentDraftPoint(false);
    }
  }, [hasIncidentDraftPoint, incidentReportMode]);

  const selectedResult = useMemo(
    () => results.find((item) => item.key === selectedKey) ?? null,
    [results, selectedKey]
  );

  useEffect(() => {
    if (!isAdminMode || !selectedResult) {
      setStationAdminDraft(null);
      setServiceAdminDraft(null);
      return;
    }

    if (selectedResult.kind === "station") {
      setStationAdminDraft(createStationAdminDraft(selectedResult.station));
      setServiceAdminDraft(null);
      return;
    }

    setServiceAdminDraft(createServiceAdminDraft(selectedResult.service));
    setStationAdminDraft(null);
  }, [isAdminMode, selectedResult]);

  useEffect(() => {
    setAdminFeedback(null);
  }, [selectedKey]);

  const mapStations = useMemo(
    () => results.filter((item): item is Extract<SearchResult, { kind: "station" }> => item.kind === "station").map((item) => item.station),
    [results]
  );

  const mapServices = useMemo(
    () => results.filter((item): item is Extract<SearchResult, { kind: "service" }> => item.kind === "service").map((item) => item.service),
    [results]
  );

  const nearbyTrafficIncidents = useMemo(() => {
    if (isAdminMode || !userLocation || trafficIncidents.length === 0) {
      return [];
    }

    return trafficIncidents
      .map((incident) => ({
        distanceKm: haversineKm(
          userLocation.lat,
          userLocation.lng,
          incident.latitude,
          incident.longitude
        ),
        incident,
      }))
      .filter((item) => item.distanceKm <= 1)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }, [isAdminMode, trafficIncidents, userLocation]);

  const visibleTrafficIncidents = useMemo(
    () =>
      trafficIncidents.filter((incident) =>
        incidentMapFilter === "all"
          ? true
          : incidentMapFilter === "nearby"
            ? nearbyTrafficIncidents.some((item) => item.incident.id === incident.id)
            : incidentMapFilter === "none"
              ? false
              : incident.incident_type === incidentMapFilter
      ),
    [incidentMapFilter, nearbyTrafficIncidents, trafficIncidents]
  );

  const nearbyTrafficIncident = nearbyTrafficIncidents[0] ?? null;
  const selectedIncidentFilterLabel =
    INCIDENT_FILTER_OPTIONS.find(([value]) => value === incidentMapFilter)?.[1] ?? "Todos";

  const handleTogglePublicFilter = (nextFilter: Exclude<PublicMapFilter, "none">) => {
    setShowIncidentFilters(false);
    setShowPublishMenu(false);
    setPublicMapFilter((current) => (current === nextFilter ? "none" : nextFilter));
  };

  const handleUseMyLocation = (options?: { silent?: boolean; source?: "auto" | "button" }) => {
    if (isAdminMode) {
      return;
    }

    if (!navigator.geolocation) {
      setLocationState("error");
      return;
    }

    setLocationState("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState("granted");
        setLocationFocusKey((current) => current + 1);
        trackAppEvent({
          eventType: "location_granted",
          targetType: "system",
          metadata: {
            source: options?.source ?? "button",
            ...toLocationAnalyticsMetadata({
              accuracy: position.coords.accuracy,
              lat: nextLocation.lat,
              lng: nextLocation.lng,
            }),
          },
        });
      },
      () => {
        setLocationState(options?.silent ? "idle" : "denied");
        trackAppEvent({
          eventType: "location_denied",
          targetType: "system",
          metadata: {
            source: options?.source ?? "button",
          },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    if (isAdminMode || hasRequestedLocation || typeof navigator === "undefined") {
      return;
    }

    setHasRequestedLocation(true);
    handleUseMyLocation({ source: "auto" });
  }, [hasRequestedLocation, isAdminMode]);

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

  const scrollToAdminEditor = () => {
    if (!detailSectionRef.current) return;
    detailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenAdminEditor = (key: string) => {
    handleSelectResult(key, "popup");
    requestAnimationFrame(() => {
      scrollToAdminEditor();
    });
  };

  const handleStationMutation = async (
    stationId: number,
    updater: (station: StationWithLatest) => StationAdminInput,
    successMessage: string
  ) => {
    const station = stations.find((item) => item.id === stationId);
    if (!station) return;

    setAdminActionKey(`station-${stationId}`);
    setAdminFeedback(null);

    try {
      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updater(station)),
      });

      const json = (await res.json()) as {
        error?: string;
        station?: Partial<StationWithLatest>;
      };

      if (!res.ok || !json.station) {
        throw new Error(json.error || "No se pudo guardar la estacion.");
      }

      setStations((current) =>
        current.map((item) =>
          item.id === stationId
            ? {
                ...item,
                ...json.station,
              }
            : item
        )
      );

      setAdminFeedback({ kind: "success", message: successMessage });
    } catch (error) {
      setAdminFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar la estacion.",
      });
    } finally {
      setAdminActionKey(null);
    }
  };

  const handleServiceMutation = async (
    serviceId: number,
    updater: (service: SupportService) => ServiceAdminInput,
    successMessage: string
  ) => {
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;

    setAdminActionKey(`service-${serviceId}`);
    setAdminFeedback(null);

    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updater(service)),
      });

      const json = (await res.json()) as {
        error?: string;
        service?: Partial<SupportService>;
      };

      if (!res.ok || !json.service) {
        throw new Error(json.error || "No se pudo guardar el servicio.");
      }

      setServices((current) =>
        current.map((item) =>
          item.id === serviceId
            ? {
                ...item,
                ...json.service,
              }
            : item
        )
      );

      setAdminFeedback({ kind: "success", message: successMessage });
    } catch (error) {
      setAdminFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar el servicio.",
      });
    } finally {
      setAdminActionKey(null);
    }
  };

  const handleAdminSaveSelected = async () => {
    if (!selectedResult) return;

    if (selectedResult.kind === "station") {
      if (!stationAdminDraft) return;

      await handleStationMutation(
        selectedResult.station.id,
        (station) => buildStationAdminPayload(station, stationAdminDraft),
        "Estacion actualizada desde el mapa."
      );
      return;
    }

    if (!serviceAdminDraft) return;

    await handleServiceMutation(
      selectedResult.service.id,
      (service) => buildServiceAdminPayload(service, serviceAdminDraft),
      "Servicio actualizado desde el mapa."
    );
  };

  const handleAdminToggleStationVerification = async (stationId: number) => {
    await handleStationMutation(
      stationId,
      (station) =>
        buildStationAdminPayload(station, {
          ...createStationAdminDraft(station),
          is_verified: !(station.is_verified ?? false),
        }),
      "Validacion de estacion actualizada."
    );
  };

  const handleAdminToggleServiceVerification = async (serviceId: number) => {
    await handleServiceMutation(
      serviceId,
      (service) =>
        buildServiceAdminPayload(service, {
          ...createServiceAdminDraft(service),
          is_verified: !service.is_verified,
        }),
      "Validacion de servicio actualizada."
    );
  };

  const handleAdminToggleServicePublication = async (serviceId: number) => {
    await handleServiceMutation(
      serviceId,
      (service) =>
        buildServiceAdminPayload(service, {
          ...createServiceAdminDraft(service),
          is_published: !(service.is_published ?? false),
        }),
      "Publicacion de servicio actualizada."
    );
  };

  const handleAdminDeleteStation = async (stationId: number) => {
    const station = stations.find((item) => item.id === stationId);
    if (!station) return;

    if (!window.confirm(`Eliminar la estacion "${station.name}" desde el mapa?`)) {
      return;
    }

    setAdminActionKey(`station-${stationId}`);
    setAdminFeedback(null);

    try {
      const res = await fetch(`/api/admin/stations/${stationId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo eliminar la estacion.");
      }

      setStations((current) => current.filter((item) => item.id !== stationId));
      setAdminFeedback({ kind: "success", message: "Estacion eliminada." });

      if (selectedKey === `station-${stationId}`) {
        setSelectedKey(null);
      }
    } catch (error) {
      setAdminFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la estacion.",
      });
    } finally {
      setAdminActionKey(null);
    }
  };

  const handleAdminDeleteService = async (serviceId: number) => {
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;

    if (!window.confirm(`Eliminar el servicio "${service.name}" desde el mapa?`)) {
      return;
    }

    setAdminActionKey(`service-${serviceId}`);
    setAdminFeedback(null);

    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo eliminar el servicio.");
      }

      setServices((current) => current.filter((item) => item.id !== serviceId));
      setAdminFeedback({ kind: "success", message: "Servicio eliminado." });

      if (selectedKey === `service-${serviceId}`) {
        setSelectedKey(null);
      }
    } catch (error) {
      setAdminFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el servicio.",
      });
    } finally {
      setAdminActionKey(null);
    }
  };

  const handleSubmitReport = async (input: ReportInput) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          visitorId,
        }),
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

  const handleQuickReport = async (input: ReportInput) => {
    const result = await handleSubmitReport(input);
    if (isAdminMode) {
      setAdminFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });
    }
    return result;
  };

  const handleSubmitStationReview = async (input: {
    comment?: string;
    score: number;
    stationId: number;
  }) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch("/api/station-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: input.comment,
          latitude: userLocation?.lat ?? null,
          longitude: userLocation?.lng ?? null,
          score: input.score,
          stationId: input.stationId,
          visitorId,
        }),
      });

      const json = (await res.json()) as {
        error?: string;
        reputationScore?: number;
        reputationVotes?: number;
      };

      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar la calificacion.");
      }

      setStations((current) =>
        current.map((station) =>
          station.id === input.stationId
            ? {
                ...station,
                reputation_score: json.reputationScore ?? station.reputation_score,
                reputation_votes: json.reputationVotes ?? station.reputation_votes,
              }
            : station
        )
      );

      return { ok: true, message: "Calificacion enviada." };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "No se pudo guardar la calificacion.",
      };
    }
  };

  const handleSubmitPlaceReport = async (input: {
    notes?: string;
    reason: "not_exists";
    targetId: number;
    targetName?: string;
    targetType: "station" | "service";
  }) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch("/api/place-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLocation?.lat ?? null,
          longitude: userLocation?.lng ?? null,
          notes: input.notes,
          reason: input.reason,
          targetId: input.targetId,
          targetName: input.targetName,
          targetType: input.targetType,
          visitorId,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar la denuncia.");
      }

      return { ok: true, message: "Denuncia enviada para revision." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo enviar la denuncia.",
      };
    }
  };

  const handleCreateTrafficIncident = async (input: {
    description?: string;
    durationMinutes?: number;
    incidentType:
      | "control_vial"
      | "corte_via"
      | "marcha"
      | "accidente"
      | "derrumbe"
      | "otro";
    latitude: number;
    longitude: number;
  }) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch("/api/traffic-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: input.description,
          durationMinutes: input.durationMinutes,
          incidentType: input.incidentType,
          latitude: input.latitude,
          longitude: input.longitude,
          visitorId,
        }),
      });

      const json = (await res.json()) as { error?: string; incident?: TrafficIncident };
      if (!res.ok || !json.incident) {
        throw new Error(json.error || "No se pudo registrar el incidente.");
      }

      setTrafficIncidents((current) => [json.incident as TrafficIncident, ...current]);

      return {
        incident: json.incident as TrafficIncident,
        message: "Incidente enviado para confirmacion comunitaria.",
        ok: true,
      };
    } catch (error) {
      return {
        message:
          error instanceof Error ? error.message : "No se pudo registrar el incidente vial.",
        ok: false,
      };
    }
  };

  const handleConfirmTrafficIncident = async (
    incidentId: number,
    action: "confirm" | "reject"
  ) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch(`/api/traffic-incidents/${incidentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          latitude: userLocation?.lat ?? null,
          longitude: userLocation?.lng ?? null,
          visitorId,
        }),
      });

      const json = (await res.json()) as {
        alreadyConfirmed?: boolean;
        confirmationCount?: number;
        error?: string;
        rejectionCount?: number;
        status?: "active" | "expired";
      };

      if (!res.ok) {
        throw new Error(json.error || "No se pudo confirmar el incidente.");
      }

      setTrafficIncidents((current) => {
        if (json.status === "expired") {
          return current.filter((incident) => incident.id !== incidentId);
        }

        return current.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                confirmation_count: json.confirmationCount ?? incident.confirmation_count,
                rejection_count: json.rejectionCount ?? incident.rejection_count,
              }
            : incident
        );
      });

      return {
        confirmationCount: json.confirmationCount,
        rejectionCount: json.rejectionCount,
        message:
          json.status === "expired"
            ? "El incidente ya no sigue y fue retirado por consenso."
            : json.alreadyConfirmed
              ? action === "reject"
                ? "Ya habias marcado este incidente como no vigente."
                : "Ya habias confirmado este incidente."
              : action === "reject"
                ? "Marcaste que este incidente ya no sigue."
                : "Incidente confirmado.",
        ok: true,
        status: json.status,
      };
    } catch (error) {
      return {
        message:
          error instanceof Error ? error.message : "No se pudo confirmar el incidente vial.",
        ok: false,
      };
    }
  };

  const handleResolveTrafficIncident = async (incidentId: number) => {
    if (!isAdminMode) {
      return { ok: false, message: "Solo el admin puede cerrar incidentes." };
    }

    setAdminActionKey(`incident-${incidentId}`);
    setAdminFeedback(null);

    try {
      const res = await fetch(`/api/admin/traffic-incidents/${incidentId}/resolve`, {
        method: "POST",
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo cerrar el incidente.");
      }

      setTrafficIncidents((current) => current.filter((incident) => incident.id !== incidentId));
      setAdminFeedback({ kind: "success", message: "Incidente marcado como resuelto." });

      return { ok: true, message: "Incidente resuelto." };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cerrar el incidente vial.";
      setAdminFeedback({ kind: "error", message });
      return { ok: false, message };
    } finally {
      setAdminActionKey(null);
    }
  };

  const handleSubmitServiceReview = async (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => {
    try {
      const visitorId = ensureVisitorId();
      const res = await fetch("/api/service-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: input.comment,
          latitude: userLocation?.lat ?? null,
          longitude: userLocation?.lng ?? null,
          score: input.score,
          serviceId: input.serviceId,
          visitorId,
        }),
      });

      const json = (await res.json()) as {
        error?: string;
        ratingCount?: number;
        ratingScore?: number;
      };

      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar la review.");
      }

      setServices((current) =>
        current.map((service) =>
          service.id === input.serviceId
            ? {
                ...service,
                rating_count: json.ratingCount ?? service.rating_count,
                rating_score: json.ratingScore ?? service.rating_score,
              }
            : service
        )
      );

      return { ok: true, message: "Review enviada." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo guardar la review.",
      };
    }
  };

  const quickResults = results.slice(0, 8);

  return (
    <div className={isAdminMode ? "space-y-4" : "space-y-3 pb-36 sm:pb-40"}>
      {isAdminMode ? (
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
              Modo admin: el mapa no se recentra en tu ubicacion para que puedas editar varios
              puntos sin perder la vista actual.
            </div>
          </div>
        </section>
      ) : null}

      {isAdminMode ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Modo admin activo
              </p>
              <p className="mt-1 text-sm text-sky-900">
                Sesion detectada para {adminSession?.email}. El mapa muestra estaciones y
                servicios aunque esten inactivos o en borrador, y permite validarlos,
                editarlos o eliminarlos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/stations"
                className="rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
              >
                Panel admin
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {!isAdminMode ? (
        <section className="rounded-[1.8rem] border border-white/80 bg-white/92 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="rounded-[1.2rem] bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estacion o auxilio"
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => handleTogglePublicFilter("stations")}
              aria-label="Estaciones de servicio"
              title="Estaciones de servicio"
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                publicMapFilter === "stations"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              ⛽
            </button>
            <button
              type="button"
              onClick={() => handleTogglePublicFilter("servicio_mecanico")}
              aria-label="Auxilio mecanico"
              title="Auxilio mecanico"
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                publicMapFilter === "servicio_mecanico"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              🔧
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPublishMenu(false);
                setShowIncidentFilters((current) => !current);
              }}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ${
                showIncidentFilters
                  ? "bg-rose-600 text-white ring-rose-600"
                  : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              Incidentes
            </button>
            <button
              type="button"
              onClick={() => {
                setShowIncidentFilters(false);
                setShowPublishMenu((current) => !current);
              }}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${
                showPublishMenu ? "bg-slate-700 text-white" : "bg-slate-950 text-white"
              }`}
            >
              Publicar
            </button>
          </div>
          {showIncidentFilters ? (
            <div className="mt-3 space-y-2 rounded-[1.4rem] bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap gap-2">
                {INCIDENT_FILTER_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIncidentMapFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      incidentMapFilter === value
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {userLocation ? (
                nearbyTrafficIncidents.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Cerca de ti
                    </div>
                    <div className="mt-1 space-y-1.5">
                      {nearbyTrafficIncidents.map((item) => (
                        <div
                          key={`nearby-incident-${item.incident.id}`}
                          className="flex items-center justify-between gap-3 text-xs text-amber-900"
                        >
                          <div className="min-w-0 truncate font-medium">
                            {getIncidentTypeLabel(item.incident.incident_type)}
                          </div>
                          <div className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {formatDistance(item.distanceKm)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    No hay incidentes activos a menos de 1 km.
                  </div>
                )
              ) : (
                <div className="text-xs text-slate-500">
                  Activa ubicacion para ver incidentes cercanos.
                </div>
              )}
            </div>
          ) : null}
          {showPublishMenu ? (
            <div className="mt-3 grid gap-2 rounded-[1.4rem] bg-slate-50 p-3 ring-1 ring-slate-200">
              <a
                href="/sumate?category=estacion"
                onClick={() =>
                  trackAppEvent({
                    eventType: "open_vendor_join",
                    targetType: "vendor_request",
                    metadata: { category: "estacion", source: "home_top_publish" },
                  })
                }
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-200"
              >
                Publicar surtidor
              </a>
              <a
                href="/sumate?category=taller_mecanico"
                onClick={() =>
                  trackAppEvent({
                    eventType: "open_vendor_join",
                    targetType: "vendor_request",
                    metadata: { category: "taller_mecanico", source: "home_top_publish" },
                  })
                }
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-200"
              >
                Publicar taller mecanico
              </a>
              <a
                href="/sumate?category=grua"
                onClick={() =>
                  trackAppEvent({
                    eventType: "open_vendor_join",
                    targetType: "vendor_request",
                    metadata: { category: "grua", source: "home_top_publish" },
                  })
                }
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-200"
              >
                Publicar grua
              </a>
              <a
                href="/sumate?category=aditivos"
                onClick={() =>
                  trackAppEvent({
                    eventType: "open_vendor_join",
                    targetType: "vendor_request",
                    metadata: { category: "aditivos", source: "home_top_publish" },
                  })
                }
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-200"
              >
                Publicar aditivos
              </a>
            </div>
          ) : null}
        </section>
      ) : null}

      {isAdminMode && quickResults.length > 0 ? (
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

      {isAdminMode ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowIncidentFilters((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-white"
          >
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Incidentes
              </div>
              <div className="truncate text-sm font-semibold text-slate-900">
                {trafficIncidents.length} activos · {selectedIncidentFilterLabel}
              </div>
              {!isAdminMode && nearbyTrafficIncidents.length > 0 ? (
                <div className="text-xs text-amber-700">
                  {nearbyTrafficIncidents.length} cerca de tu ubicacion
                </div>
              ) : null}
            </div>
            <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {showIncidentFilters ? "Ocultar" : "Filtrar"}
            </div>
          </button>
          {showIncidentFilters ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {INCIDENT_FILTER_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIncidentMapFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      incidentMapFilter === value
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {!isAdminMode && userLocation ? (
                nearbyTrafficIncidents.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Cerca de ti
                    </div>
                    <div className="mt-1 space-y-1.5">
                      {nearbyTrafficIncidents.map((item) => (
                        <div
                          key={`nearby-incident-${item.incident.id}`}
                          className="flex items-center justify-between gap-3 text-xs text-amber-900"
                        >
                          <div className="min-w-0 truncate font-medium">
                            {getIncidentTypeLabel(item.incident.incident_type)}
                          </div>
                          <div className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {formatDistance(item.distanceKm)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    No hay incidentes activos a menos de 1 km.
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      <section
        className={`relative overflow-hidden ${
          isAdminMode
            ? "rounded-3xl border border-slate-200 bg-white shadow-sm"
            : "rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 z-[500] flex justify-center px-3 ${
            isAdminMode ? "bottom-4" : "bottom-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setIncidentReportMode((current) => !current)}
            className={`pointer-events-auto rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg ring-2 backdrop-blur transition ${
              incidentReportMode
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-rose-600 text-white ring-rose-300 hover:bg-rose-500"
            }`}
          >
            {incidentReportMode ? "Salir del modo incidente" : "Reportar incidente"}
          </button>
        </div>
        {!isAdminMode ? (
          <div className="pointer-events-none absolute right-3 top-3 z-[500]">
            <button
              type="button"
              onClick={() => handleUseMyLocation({ source: "button" })}
              aria-label={
                locationState === "granted" ? "Ir a mi ubicacion" : "Activar ubicacion"
              }
              title={locationState === "granted" ? "Ir a mi ubicacion" : "Activar ubicacion"}
              className={`pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ring-1 backdrop-blur transition ${
                locationState === "granted"
                  ? "bg-white/96 ring-sky-200 hover:bg-white"
                  : locationState === "loading"
                    ? "bg-white/96 ring-amber-200 hover:bg-white"
                    : "bg-white/92 ring-slate-200 hover:bg-white"
              }`}
            >
              <span
                className={`relative block h-5 w-5 rounded-full border-2 ${
                  locationState === "granted"
                    ? "border-sky-600"
                    : locationState === "loading"
                      ? "border-amber-500 animate-pulse"
                      : "border-slate-400"
                }`}
              >
                <span
                  className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    locationState === "granted"
                      ? "bg-sky-600"
                      : locationState === "loading"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                  }`}
                />
                {locationState !== "granted" ? (
                  <span className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-slate-400/90" />
                ) : null}
              </span>
            </button>
          </div>
        ) : null}
        {!isAdminMode && locationState !== "granted" ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] flex justify-center px-3">
            <div className="pointer-events-auto w-full max-w-sm rounded-[1.5rem] border border-amber-200 bg-white/96 p-4 shadow-xl backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">
                Activa tu ubicacion para centrar el mapa y ver lo que esta cerca.
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Sin GPS no se puede mostrar tu zona actual ni priorizar incidentes cercanos.
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleUseMyLocation({ source: "button" })}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  {locationState === "loading" ? "Activando GPS..." : "Activar GPS"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {!isAdminMode && showHomeGuide ? (
          <div className="pointer-events-none absolute inset-x-0 top-28 z-[500] flex justify-center px-3">
            <div className="pointer-events-auto w-full max-w-sm rounded-[1.6rem] border border-white/70 bg-white/94 p-4 shadow-xl backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Guia rapida
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    Toca un punto para ver detalles.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHomeGuide(false);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("surtimapa-home-guide-dismissed", "1");
                    }
                  }}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div>1. Usa el buscador y filtros de arriba.</div>
                <div>2. Toca una estacion o servicio para ver informacion.</div>
                <div>3. Usa el boton rojo para reportar incidentes.</div>
              </div>
            </div>
          </div>
        ) : null}
        {incidentReportMode && !hasIncidentDraftPoint ? (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-[500] flex justify-center px-3">
            <div className="rounded-2xl border border-amber-300 bg-amber-400/96 px-4 py-3 text-center text-slate-950 shadow-xl backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                Reportar incidente
              </div>
              <div className="mt-1 text-xs font-semibold">
                Coloca el punto exacto del incidente en el mapa.
              </div>
            </div>
          </div>
        ) : null}
        {!incidentReportMode && nearbyTrafficIncident ? (
          <div
            className={`pointer-events-none absolute inset-x-0 z-[500] flex justify-center px-3 ${
              isAdminMode ? "bottom-16" : "bottom-16 sm:bottom-20"
            }`}
          >
            <div
              className={`animate-pulse rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${getIncidentAlertMeta(
                nearbyTrafficIncident.incident.incident_type
              ).cardClass}`}
            >
              <div className="flex items-center gap-3 text-left">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${getIncidentAlertMeta(
                    nearbyTrafficIncident.incident.incident_type
                  ).badgeClass}`}
                >
                  {getIncidentAlertMeta(nearbyTrafficIncident.incident.incident_type).icon}
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Warning
                  </div>
                  <div className="text-xs font-semibold">
                    {getIncidentAlertMeta(nearbyTrafficIncident.incident.incident_type).title}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {getIncidentTypeLabel(nearbyTrafficIncident.incident.incident_type)} a{" "}
                    {formatDistance(nearbyTrafficIncident.distanceKm)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={isAdminMode ? "h-[58vh] min-h-[420px] sm:h-[70vh]" : "h-[72vh] min-h-[480px]"}>
          <StationsMap
            adminActionKey={adminActionKey}
            incidentReportMode={incidentReportMode}
            incidents={visibleTrafficIncidents}
            isAdminMode={isAdminMode}
            nearbyIncidentId={nearbyTrafficIncident?.incident.id ?? null}
            onCancelIncidentReport={() => setIncidentReportMode(false)}
            onIncidentDraftStateChange={setHasIncidentDraftPoint}
            onConfirmTrafficIncident={handleConfirmTrafficIncident}
            onCreateTrafficIncident={handleCreateTrafficIncident}
            onQuickReportStation={handleQuickReport}
            onResolveTrafficIncident={handleResolveTrafficIncident}
            onSubmitPlaceReport={handleSubmitPlaceReport}
            onSubmitStationReview={handleSubmitStationReview}
            onSubmitServiceReview={handleSubmitServiceReview}
            onAdminDeleteService={handleAdminDeleteService}
            onAdminDeleteStation={handleAdminDeleteStation}
            onAdminOpenEditor={handleOpenAdminEditor}
            onAdminToggleServicePublication={handleAdminToggleServicePublication}
            onAdminToggleServiceVerification={handleAdminToggleServiceVerification}
            onAdminToggleStationVerification={handleAdminToggleStationVerification}
            services={mapServices}
            stations={mapStations}
            selectedKey={selectedKey}
            onRequestReportStation={handleRequestReportStation}
            onSelectKey={(key) => handleSelectResult(key, "map")}
            userLocationFocusKey={locationFocusKey}
            userLocation={isAdminMode ? null : userLocation}
          />
        </div>
      </section>
      <div className="px-1 text-center text-[11px] text-slate-400">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          OpenStreetMap
        </a>{" "}
        ·{" "}
        <a
          href="https://leafletjs.com/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-500 hover:text-slate-700"
        >
          Leaflet
        </a>
      </div>

      {isAdminMode ? (
      <section
        ref={(node) => {
          detailSectionRef.current = node;
        }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {isAdminMode && adminFeedback ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              adminFeedback.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {adminFeedback.message}
          </div>
        ) : null}

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

            {isAdminMode && stationAdminDraft ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Edicion admin desde mapa
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Valida, ajusta datos basicos y elimina la estacion sin salir del mapa.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/admin/stations/${selectedResult.station.id}`}
                      className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100"
                    >
                      Formulario completo
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={stationAdminDraft.name}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, name: event.target.value } : current
                      )
                    }
                    placeholder="Nombre"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={stationAdminDraft.zone}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, zone: event.target.value } : current
                      )
                    }
                    placeholder="Zona"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={stationAdminDraft.city}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, city: event.target.value } : current
                      )
                    }
                    placeholder="Ciudad"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={stationAdminDraft.address}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, address: event.target.value } : current
                      )
                    }
                    placeholder="Direccion"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={stationAdminDraft.latitude}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, latitude: event.target.value } : current
                      )
                    }
                    placeholder="Latitud"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={stationAdminDraft.longitude}
                    onChange={(event) =>
                      setStationAdminDraft((current) =>
                        current ? { ...current, longitude: event.target.value } : current
                      )
                    }
                    placeholder="Longitud"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stationAdminDraft.is_active}
                      onChange={(event) =>
                        setStationAdminDraft((current) =>
                          current ? { ...current, is_active: event.target.checked } : current
                        )
                      }
                    />
                    Activa
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stationAdminDraft.is_verified}
                      onChange={(event) =>
                        setStationAdminDraft((current) =>
                          current ? { ...current, is_verified: event.target.checked } : current
                        )
                      }
                    />
                    Validada
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAdminSaveSelected}
                    disabled={adminActionKey === `station-${selectedResult.station.id}`}
                    className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {adminActionKey === `station-${selectedResult.station.id}`
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminToggleStationVerification(selectedResult.station.id)
                    }
                    disabled={adminActionKey === `station-${selectedResult.station.id}`}
                    className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {selectedResult.station.is_verified ? "Quitar validacion" : "Validar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminDeleteStation(selectedResult.station.id)}
                    disabled={adminActionKey === `station-${selectedResult.station.id}`}
                    className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : null}
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

            {isAdminMode && serviceAdminDraft ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Edicion admin desde mapa
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Publica, valida, corrige y elimina servicios directamente desde la vista del mapa.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/admin/services/${selectedResult.service.id}`}
                      className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100"
                    >
                      Formulario completo
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={serviceAdminDraft.name}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, name: event.target.value } : current
                      )
                    }
                    placeholder="Nombre"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <select
                    value={serviceAdminDraft.category}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current
                          ? {
                              ...current,
                              category: event.target.value as SupportServiceCategory,
                            }
                          : current
                      )
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  >
                    <option value="taller_mecanico">Taller mecanico</option>
                    <option value="grua">Grua</option>
                    <option value="servicio_mecanico">Auxilio mecanico</option>
                    <option value="aditivos">Aditivos</option>
                  </select>
                  <input
                    value={serviceAdminDraft.zone}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, zone: event.target.value } : current
                      )
                    }
                    placeholder="Zona"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.city}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, city: event.target.value } : current
                      )
                    }
                    placeholder="Ciudad"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.address}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, address: event.target.value } : current
                      )
                    }
                    placeholder="Direccion"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 sm:col-span-2"
                  />
                  <input
                    value={serviceAdminDraft.latitude}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, latitude: event.target.value } : current
                      )
                    }
                    placeholder="Latitud"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.longitude}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, longitude: event.target.value } : current
                      )
                    }
                    placeholder="Longitud"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.phone}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, phone: event.target.value } : current
                      )
                    }
                    placeholder="Telefono"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.whatsapp_number}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, whatsapp_number: event.target.value } : current
                      )
                    }
                    placeholder="WhatsApp"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.price_text}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, price_text: event.target.value } : current
                      )
                    }
                    placeholder="Precio"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.meeting_point}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, meeting_point: event.target.value } : current
                      )
                    }
                    placeholder="Punto de encuentro"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  <input
                    value={serviceAdminDraft.website_url}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, website_url: event.target.value } : current
                      )
                    }
                    placeholder="Sitio web"
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 sm:col-span-2"
                  />
                  <textarea
                    value={serviceAdminDraft.description}
                    onChange={(event) =>
                      setServiceAdminDraft((current) =>
                        current ? { ...current, description: event.target.value } : current
                      )
                    }
                    placeholder="Descripcion"
                    rows={4}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 sm:col-span-2"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={serviceAdminDraft.is_active}
                      onChange={(event) =>
                        setServiceAdminDraft((current) =>
                          current ? { ...current, is_active: event.target.checked } : current
                        )
                      }
                    />
                    Activo
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={serviceAdminDraft.is_published}
                      onChange={(event) =>
                        setServiceAdminDraft((current) =>
                          current ? { ...current, is_published: event.target.checked } : current
                        )
                      }
                    />
                    Publicado
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={serviceAdminDraft.is_verified}
                      onChange={(event) =>
                        setServiceAdminDraft((current) =>
                          current ? { ...current, is_verified: event.target.checked } : current
                        )
                      }
                    />
                    Validado
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAdminSaveSelected}
                    disabled={adminActionKey === `service-${selectedResult.service.id}`}
                    className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {adminActionKey === `service-${selectedResult.service.id}`
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminToggleServiceVerification(selectedResult.service.id)
                    }
                    disabled={adminActionKey === `service-${selectedResult.service.id}`}
                    className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {selectedResult.service.is_verified ? "Quitar validacion" : "Validar"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminToggleServicePublication(selectedResult.service.id)
                    }
                    disabled={adminActionKey === `service-${selectedResult.service.id}`}
                    className="rounded-xl border border-amber-300 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                  >
                    {selectedResult.service.is_published ? "Pasar a borrador" : "Publicar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminDeleteService(selectedResult.service.id)}
                    disabled={adminActionKey === `service-${selectedResult.service.id}`}
                    className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
