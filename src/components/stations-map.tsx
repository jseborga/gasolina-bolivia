"use client";

import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  selectedStationId: number | null;
  onSelectStation: (id: number) => void;
  userLocation: { lat: number; lng: number } | null;
};

function getMarkerColor(status?: string | null) {
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
      return { color: "#d97706", label: "T" };
    case "grua":
      return { color: "#e11d48", label: "G" };
    case "servicio_mecanico":
      return { color: "#0284c7", label: "S" };
    case "aditivos":
    default:
      return { color: "#059669", label: "A" };
  }
}

function createStationMarkerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:9999px;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 0 1px rgba(0,0,0,0.15);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createServiceMarkerIcon(category: SupportServiceCategory) {
  const { color, label } = getServiceMarkerMeta(category);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:6px;
        background:${color};
        border:2px solid white;
        box-shadow:0 0 0 1px rgba(0,0,0,0.2);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:11px;
        font-weight:700;
      ">${label}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function StationsMap({
  services,
  stations,
  selectedStationId,
  onSelectStation,
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
          const phoneHref = buildTelHref(service.phone ?? service.whatsapp_number);
          const whatsappHref = buildWhatsAppHref(service.whatsapp_number ?? service.phone);

          return (
            <Marker
              key={`service-${service.id}`}
              position={[service.latitude as number, service.longitude as number]}
              icon={createServiceMarkerIcon(service.category)}
            >
              <Popup>
                <div className="min-w-[220px] text-sm text-slate-800">
                  <div className="font-semibold">{service.name}</div>
                  <div>{getSupportServiceLabel(service.category)}</div>
                  <div>{[service.zone, service.city].filter(Boolean).join(" | ") || "Sin zona"}</div>
                  <div>{service.address || "Sin direccion"}</div>
                  {service.description && <div className="mt-2">{service.description}</div>}
                  {(service.phone || service.whatsapp_number) && (
                    <div className="mt-2">
                      Contacto: {formatContactLabel(service.phone ?? service.whatsapp_number)}
                    </div>
                  )}
                  {service.distanceKm != null && (
                    <div className="mt-1">Distancia: {service.distanceKm.toFixed(1)} km</div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
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
          const color =
            station.id === selectedStationId
              ? "#111827"
              : getMarkerColor(station.latestReport?.availability_status);

          return (
            <Marker
              key={`station-${station.id}`}
              position={[station.latitude as number, station.longitude as number]}
              icon={createStationMarkerIcon(color)}
              eventHandlers={{
                click: () => onSelectStation(station.id),
              }}
            >
              <Popup>
                <div className="min-w-[180px] text-sm">
                  <div className="font-semibold">{station.name}</div>
                  <div>Zona: {station.zone || "Sin zona"}</div>
                  <div>Combustible: {station.latestReport?.fuel_type ?? "Sin dato"}</div>
                  <div>
                    Disponibilidad: {station.latestReport?.availability_status ?? "sin_dato"}
                  </div>
                  <div>Fila: {station.latestReport?.queue_status ?? "sin_dato"}</div>
                  {station.distanceKm != null && (
                    <div>Distancia: {station.distanceKm.toFixed(1)} km</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
