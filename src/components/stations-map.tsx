"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackAppEvent } from "@/lib/analytics";
import { RatingStars } from "@/components/rating-stars";
import { buildTelHref, buildWhatsAppHref, formatContactLabel } from "@/lib/contact";
import { formatAvailability, formatFuelType, formatQueue } from "@/lib/reporting";
import { getSupportServiceLabel } from "@/lib/services";
import type {
  ReportInput,
  StationWithLatest,
  SupportServiceCategory,
  SupportServiceWithDistance,
} from "@/lib/types";

type StationsMapProps = {
  adminActionKey?: string | null;
  isAdminMode?: boolean;
  onAdminDeleteService?: (serviceId: number) => void;
  onAdminDeleteStation?: (stationId: number) => void;
  onAdminOpenEditor?: (key: string) => void;
  onAdminToggleServicePublication?: (serviceId: number) => void;
  onAdminToggleServiceVerification?: (serviceId: number) => void;
  onAdminToggleStationVerification?: (stationId: number) => void;
  onQuickReportStation?: (
    input: ReportInput
  ) => Promise<{ ok: boolean; message: string }>;
  onSubmitServiceReview?: (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  services: SupportServiceWithDistance[];
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onRequestReportStation: (stationId: number, source: "detail" | "popup") => void;
  userLocation: { lat: number; lng: number } | null;
};

function StationQuickReportPopup({
  onSubmit,
  station,
}: {
  onSubmit?: (input: ReportInput) => Promise<{ ok: boolean; message: string }>;
  station: StationWithLatest;
}) {
  const [fuelType, setFuelType] = useState<ReportInput["fuel_type"]>(
    station.latestReport?.fuel_type ?? "especial"
  );
  const [availabilityStatus, setAvailabilityStatus] =
    useState<ReportInput["availability_status"]>(
      station.latestReport?.availability_status ?? "si_hay"
    );
  const [queueStatus, setQueueStatus] = useState<ReportInput["queue_status"]>(
    station.latestReport?.queue_status ?? "sin_dato"
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!onSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        availability_status: availabilityStatus,
        fuel_type: fuelType,
        queue_status: queueStatus,
        station_id: station.id,
      });
      setFeedback(result);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Reporte rapido
      </div>
      <div className="grid gap-2">
        <select
          value={fuelType}
          onChange={(event) => setFuelType(event.target.value as ReportInput["fuel_type"])}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
        >
          <option value="especial">Especial</option>
          <option value="premium">Premium</option>
          <option value="diesel">Diesel</option>
        </select>
        <select
          value={availabilityStatus}
          onChange={(event) =>
            setAvailabilityStatus(event.target.value as ReportInput["availability_status"])
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
        >
          <option value="si_hay">Si hay</option>
          <option value="no_hay">No hay</option>
          <option value="sin_dato">Sin dato</option>
        </select>
        <select
          value={queueStatus}
          onChange={(event) => setQueueStatus(event.target.value as ReportInput["queue_status"])}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
        >
          <option value="sin_dato">Sin fila</option>
          <option value="corta">Fila corta</option>
          <option value="media">Fila media</option>
          <option value="larga">Fila larga</option>
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar rapido"}
        </button>
      </div>
      {feedback ? (
        <div
          className={`rounded-lg px-2 py-1.5 text-xs ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

function ServiceReviewPopup({
  onSubmit,
  serviceId,
}: {
  onSubmit?: (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  serviceId: number;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!onSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        comment: comment.trim() || undefined,
        score,
        serviceId,
      });
      setFeedback(result);
      if (result.ok) {
        setComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Review anonima
      </div>
      <select
        value={score}
        onChange={(event) => setScore(Number(event.target.value))}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
      >
        <option value={5}>5 estrellas</option>
        <option value={4}>4 estrellas</option>
        <option value={3}>3 estrellas</option>
        <option value={2}>2 estrellas</option>
        <option value={1}>1 estrella</option>
      </select>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 180))}
        placeholder="Review corta y anonima"
        rows={2}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar review"}
      </button>
      {feedback ? (
        <div
          className={`rounded-lg px-2 py-1.5 text-xs ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

function getStationMarkerColor(status?: string | null) {
  switch (status) {
    case "si_hay":
      return "#16a34a";
    case "no_hay":
      return "#dc2626";
    case "sin_dato":
    default:
      return "#f59e0b";
  }
}

function getServiceMarkerMeta(category: SupportServiceCategory) {
  switch (category) {
    case "taller_mecanico":
      return { color: "#b45309", label: "T" };
    case "grua":
      return { color: "#e11d48", label: "G" };
    case "servicio_mecanico":
      return { color: "#0369a1", label: "A" };
    case "aditivos":
    default:
      return { color: "#15803d", label: "$" };
  }
}

function createStationMarkerIcon(color: string, isSelected: boolean, isActive: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 22 : 18}px;
        height:${isSelected ? 22 : 18}px;
        border-radius:9999px;
        background:${isActive ? color : "#94a3b8"};
        border:3px solid white;
        box-shadow:0 0 0 ${isSelected ? 2 : 1}px rgba(15,23,42,0.18);
        opacity:${isActive ? 1 : 0.68};
      "></div>
    `,
    iconSize: [isSelected ? 22 : 18, isSelected ? 22 : 18],
    iconAnchor: [isSelected ? 11 : 9, isSelected ? 11 : 9],
  });
}

function createServiceMarkerIcon(
  category: SupportServiceCategory,
  isSelected: boolean,
  isVisible: boolean
) {
  const { color, label } = getServiceMarkerMeta(category);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 28 : 24}px;
        height:${isSelected ? 28 : 24}px;
        border-radius:8px;
        background:${color};
        border:2px solid white;
        box-shadow:0 0 0 ${isSelected ? 2 : 1}px rgba(15,23,42,0.24);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:${isSelected ? 13 : 12}px;
        font-weight:700;
        opacity:${isVisible ? 1 : 0.68};
      ">${label}</div>
    `,
    iconSize: [isSelected ? 28 : 24, isSelected ? 28 : 24],
    iconAnchor: [isSelected ? 14 : 12, isSelected ? 14 : 12],
  });
}

function MapFocusController({
  selectedKey,
  stations,
  services,
}: {
  selectedKey: string | null;
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  services: SupportServiceWithDistance[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedKey) return;

    const station = selectedKey.startsWith("station-")
      ? stations.find((item) => `station-${item.id}` === selectedKey)
      : null;
    const service = selectedKey.startsWith("service-")
      ? services.find((item) => `service-${item.id}` === selectedKey)
      : null;

    const latitude = station?.latitude ?? service?.latitude;
    const longitude = station?.longitude ?? service?.longitude;

    if (typeof latitude === "number" && typeof longitude === "number") {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.9,
      });
    }
  }, [map, selectedKey, services, stations]);

  return null;
}

export default function StationsMap({
  adminActionKey = null,
  isAdminMode = false,
  onAdminDeleteService,
  onAdminDeleteStation,
  onAdminOpenEditor,
  onAdminToggleServicePublication,
  onAdminToggleServiceVerification,
  onAdminToggleStationVerification,
  onQuickReportStation,
  onSubmitServiceReview,
  services,
  stations,
  selectedKey,
  onSelectKey,
  onRequestReportStation,
  userLocation,
}: StationsMapProps) {
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [-16.5, -68.15];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFocusController selectedKey={selectedKey} stations={stations} services={services} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9 }}
        >
          <Popup>Tu ubicacion</Popup>
        </CircleMarker>
      )}

      {services
        .filter(
          (service) =>
            typeof service.latitude === "number" && typeof service.longitude === "number"
        )
        .map((service) => {
          const key = `service-${service.id}`;
          const phoneHref = buildTelHref(service.phone ?? service.whatsapp_number);
          const whatsappHref = buildWhatsAppHref(service.whatsapp_number ?? service.phone);
          const isSelected = selectedKey === key;
          const isBusy = adminActionKey === key;
          const isVisible = service.is_active && (service.is_published ?? true);

          return (
            <Marker
              key={key}
              position={[service.latitude as number, service.longitude as number]}
              icon={createServiceMarkerIcon(service.category, isSelected, isVisible)}
              eventHandlers={{
                click: () => onSelectKey(key),
              }}
            >
              <Popup>
                <div className="min-w-[220px] space-y-2 text-sm text-slate-800">
                  <div className="font-semibold">{service.name}</div>
                  <div>{getSupportServiceLabel(service.category)}</div>
                  <RatingStars score={service.rating_score} count={service.rating_count} />
                  <div>{[service.zone, service.city].filter(Boolean).join(" | ") || "Sin zona"}</div>
                  <div>{service.address || "Sin direccion"}</div>
                  {service.price_text && <div>Precio: {service.price_text}</div>}
                  {service.meeting_point && <div>Punto: {service.meeting_point}</div>}
                  {service.description && <div>{service.description}</div>}
                  {(service.phone || service.whatsapp_number) && (
                    <div>Contacto: {formatContactLabel(service.phone ?? service.whatsapp_number)}</div>
                  )}
                  {isAdminMode && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          service.is_verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {service.is_verified ? "Validado" : "Pendiente"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 ${
                          service.is_published
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {service.is_published ? "Publicado" : "Borrador"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        onClick={() =>
                          trackAppEvent({
                            eventType: "contact_whatsapp",
                            targetId: service.id,
                            targetName: service.name,
                            targetType: "service",
                            metadata: {
                              category: service.category,
                              source: "popup",
                            },
                          })
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        WhatsApp
                      </a>
                    )}
                    {phoneHref && (
                      <a
                        href={phoneHref}
                        onClick={() =>
                          trackAppEvent({
                            eventType: "contact_phone",
                            targetId: service.id,
                            targetName: service.name,
                            targetType: "service",
                            metadata: {
                              category: service.category,
                              source: "popup",
                            },
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        Llamar
                      </a>
                    )}
                    {isAdminMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAdminOpenEditor?.(key)}
                          disabled={isBusy}
                          className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 disabled:opacity-60"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdminToggleServiceVerification?.(service.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-60"
                        >
                          {service.is_verified ? "Quitar valid." : "Validar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdminToggleServicePublication?.(service.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-60"
                        >
                          {service.is_published ? "Borrador" : "Publicar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdminDeleteService?.(service.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : null}
                  </div>
                  <ServiceReviewPopup
                    onSubmit={onSubmitServiceReview}
                    serviceId={service.id}
                  />
                </div>
              </Popup>
            </Marker>
          );
        })}

      {stations
        .filter(
          (station) =>
            typeof station.latitude === "number" && typeof station.longitude === "number"
        )
        .map((station) => {
          const key = `station-${station.id}`;
          const isSelected = selectedKey === key;
          const color = getStationMarkerColor(station.latestReport?.availability_status);
          const isBusy = adminActionKey === key;

          return (
            <Marker
              key={key}
              position={[station.latitude as number, station.longitude as number]}
              icon={createStationMarkerIcon(color, isSelected, station.is_active ?? true)}
              eventHandlers={{
                click: () => onSelectKey(key),
              }}
            >
              <Popup>
                <div className="min-w-[220px] space-y-2 text-sm text-slate-800">
                  <div className="font-semibold">{station.name}</div>
                  <div>{station.zone || "Sin zona"}</div>
                  <RatingStars
                    score={station.reputation_score}
                    count={station.reputation_votes}
                  />
                  {isAdminMode && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          station.is_verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {station.is_verified ? "Validada" : "Pendiente"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 ${
                          station.is_active
                            ? "bg-slate-100 text-slate-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {station.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  )}
                  <div>
                    Estado: {formatAvailability(station.latestReport?.availability_status)}
                  </div>
                  <div>Combustible: {formatFuelType(station.latestReport?.fuel_type)}</div>
                  <div>Fila: {formatQueue(station.latestReport?.queue_status)}</div>
                  <div>{station.address || "Sin direccion"}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRequestReportStation(station.id, "popup")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Informar estado
                    </button>
                    {isAdminMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAdminOpenEditor?.(key)}
                          disabled={isBusy}
                          className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 disabled:opacity-60"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdminToggleStationVerification?.(station.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-60"
                        >
                          {station.is_verified ? "Quitar valid." : "Validar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdminDeleteStation?.(station.id)}
                          disabled={isBusy}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : null}
                  </div>
                  <StationQuickReportPopup
                    onSubmit={onQuickReportStation}
                    station={station}
                  />
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
