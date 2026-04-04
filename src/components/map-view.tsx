"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { formatDistanceKm } from "@/lib/geo";
import { getAvailabilityLabel, getFuelLabel, getQueueLabel } from "@/lib/reporting";
import type { StationWithLatest, UserLocation } from "@/lib/types";

type Props = {
  stations: StationWithLatest[];
  userLocation?: UserLocation | null;
  distances?: Record<number, number | null>;
};

function markerColor(availability?: string | null) {
  if (availability === "si_hay") return "#16a34a";
  if (availability === "no_hay") return "#e11d48";
  return "#f59e0b";
}

function RecenterMap({ userLocation }: { userLocation?: UserLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 13, {
        animate: true,
      });
    }
  }, [map, userLocation]);

  return null;
}

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function MapView({ stations, userLocation, distances = {} }: Props) {
  const withCoords = stations.filter(
    (station) =>
      typeof station.latitude === "number" &&
      typeof station.longitude === "number"
  );

  if (withCoords.length === 0) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        No hay coordenadas suficientes para mostrar el mapa.
      </div>
    );
  }

  const defaultCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [-16.5, -68.13];

  return (
    <div className="h-[380px] overflow-hidden rounded-[28px] border border-slate-200 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap userLocation={userLocation} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup>Tu ubicación aproximada</Popup>
          </Marker>
        )}

        {withCoords.map((station) => (
          <CircleMarker
            key={station.id}
            center={[station.latitude as number, station.longitude as number]}
            radius={10}
            pathOptions={{
              color: markerColor(station.latestReport?.availability_status),
              fillColor: markerColor(station.latestReport?.availability_status),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1 text-sm">
                <div className="font-semibold">{station.name}</div>
                <div>Zona: {station.zone ?? "Sin zona"}</div>
                <div>Disponibilidad: {getAvailabilityLabel(station.latestReport?.availability_status)}</div>
                <div>Combustible: {getFuelLabel(station.latestReport?.fuel_type)}</div>
                <div>Fila: {getQueueLabel(station.latestReport?.queue_status)}</div>
                {distances[station.id] != null && (
                  <div>Distancia: {formatDistanceKm(distances[station.id])}</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
