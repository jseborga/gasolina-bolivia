"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RatingStars } from "@/components/rating-stars";
import { buildTelHref, buildWhatsAppHref, formatContactLabel } from "@/lib/contact";
import { getSupportServiceLabel } from "@/lib/services";
import type {
  StationWithLatest,
  SupportServiceCategory,
  SupportServiceWithDistance,
} from "@/lib/types";

type StationsMapProps = {
  services: SupportServiceWithDistance[];
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  userLocation: { lat: number; lng: number } | null;
};

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

function createStationMarkerIcon(color: string, isSelected: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 22 : 18}px;
        height:${isSelected ? 22 : 18}px;
        border-radius:9999px;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 0 ${isSelected ? 2 : 1}px rgba(15,23,42,0.18);
      "></div>
    `,
    iconSize: [isSelected ? 22 : 18, isSelected ? 22 : 18],
    iconAnchor: [isSelected ? 11 : 9, isSelected ? 11 : 9],
  });
}

function createServiceMarkerIcon(category: SupportServiceCategory, isSelected: boolean) {
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
  services,
  stations,
  selectedKey,
  onSelectKey,
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

          return (
            <Marker
              key={key}
              position={[service.latitude as number, service.longitude as number]}
              icon={createServiceMarkerIcon(service.category, isSelected)}
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
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
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        Llamar
                      </a>
                    )}
                  </div>
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

          return (
            <Marker
              key={key}
              position={[station.latitude as number, station.longitude as number]}
              icon={createStationMarkerIcon(color, isSelected)}
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
                  <div>
                    Estado: {station.latestReport?.availability_status ?? "sin_dato"}
                  </div>
                  <div>Combustible: {station.latestReport?.fuel_type ?? "Sin dato"}</div>
                  <div>Fila: {station.latestReport?.queue_status ?? "sin_dato"}</div>
                  <div>{station.address || "Sin direccion"}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
