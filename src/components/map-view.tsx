"use client";

import { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { formatDistanceKm } from "@/lib/geo";
import { getAvailabilityLabel, getFuelLabel, getQueueLabel } from "@/lib/reporting";
import type { StationWithLatest, UserLocation } from "@/lib/types";
import "leaflet/dist/leaflet.css";

type Props = {
  stations: StationWithLatest[];
  selectedStationId: number | null;
  onSelectStation: (id: number) => void;
  userLocation: UserLocation | null;
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

function createMarkerIcon(color: string, selected = false) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${selected ? 22 : 18}px;
        height: ${selected ? 22 : 18}px;
        border-radius: 9999px;
        background: ${selected ? "#111827" : color};
        border: 3px solid white;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.18);
      "></div>
    `,
    iconSize: selected ? [22, 22] : [18, 18],
    iconAnchor: selected ? [11, 11] : [9, 9],
  });
}

function RecenterMap({ userLocation }: { userLocation: UserLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 13, {
        animate: true,
      });
    }
  }, [userLocation, map]);

  return null;
}

export function MapView({
  stations,
  selectedStationId,
  onSelectStation,
  userLocation,
}: Props) {
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
      <RecenterMap userLocation={userLocation} />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
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
          const latest = station.latestReport;
          const color = getMarkerColor(latest?.availability_status);
          const selected = station.id === selectedStationId;

          return (
            <Marker
              key={station.id}
              position={[station.latitude as number, station.longitude as number]}
              icon={createMarkerIcon(color, selected)}
              eventHandlers={{
                click: () => onSelectStation(station.id),
              }}
            >
              <Popup>
                <div className="min-w-[190px] text-sm">
                  <div className="font-semibold">{station.name}</div>
                  <div>Zona: {station.zone || "Sin zona"}</div>
                  <div>Combustible: {getFuelLabel(latest?.fuel_type)}</div>
                  <div>Disponibilidad: {getAvailabilityLabel(latest?.availability_status)}</div>
                  <div>Fila: {getQueueLabel(latest?.queue_status)}</div>
                  {station.distanceKm != null && (
                    <div>Distancia: {formatDistanceKm(station.distanceKm)}</div>
                  )}
                  {latest?.comment && <div>Comentario: {latest.comment}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}

export default MapView;
