"use client";

import { MapContainer, Marker, Popup, TileLayer, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StationWithLatest } from "@/lib/types";

type StationsMapProps = {
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  selectedStationId: number | null;
  onSelectStation: (id: number) => void;
  userLocation: { lat: number; lng: number } | null;
};

function getMarkerColor(status?: string | null) {
  switch (status) {
    case "si_hay":
      return "green";
    case "no_hay":
      return "red";
    case "sin_dato":
    default:
      return "orange";
  }
}

function createMarkerIcon(color: string) {
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

export default function StationsMap({
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
      scrollWheelZoom={true}
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
          <Popup>Tu ubicación</Popup>
        </CircleMarker>
      )}

      {stations
        .filter(
          (station) =>
            typeof station.latitude === "number" &&
            typeof station.longitude === "number"
        )
        .map((station) => {
          const color = getMarkerColor(station.latestReport?.availability_status);
          const icon = createMarkerIcon(
            station.id === selectedStationId ? "#111827" : color
          );

          return (
            <Marker
              key={station.id}
              position={[station.latitude as number, station.longitude as number]}
              icon={icon}
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
