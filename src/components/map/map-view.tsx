"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import { StationWithLatest } from "@/lib/types";
import { formatAvailability, formatFuelType, formatQueue } from "@/lib/reporting";

function getColor(status?: string) {
  if (status === "si_hay") return "#10b981";
  if (status === "no_hay") return "#ef4444";
  return "#f59e0b";
}

export default function MapView({
  stations,
  userLocation,
}: {
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  userLocation: { latitude: number; longitude: number } | null;
}) {
  const center: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [-16.5, -68.13];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {userLocation ? (
        <CircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.7 }}>
          <Popup>Tu ubicación</Popup>
        </CircleMarker>
      ) : null}

      {stations.filter((s) => s.latitude != null && s.longitude != null).map((station) => (
        <CircleMarker
          key={station.id}
          center={[station.latitude as number, station.longitude as number]}
          radius={10}
          pathOptions={{ color: getColor(station.latestReport?.availability_status), fillColor: getColor(station.latestReport?.availability_status), fillOpacity: 0.85 }}
        >
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold">{station.name}</div>
              <div>{station.zone ?? "Sin zona"}</div>
              {station.latestReport ? (
                <>
                  <div>{formatFuelType(station.latestReport.fuel_type)}</div>
                  <div>{formatAvailability(station.latestReport.availability_status)}</div>
                  <div>{formatQueue(station.latestReport.queue_status)}</div>
                </>
              ) : (
                <div>Sin reportes</div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
