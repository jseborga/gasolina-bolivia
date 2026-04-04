"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { StationWithLatest } from "@/lib/types";

type Props = {
  stations: StationWithLatest[];
};

function markerColor(availability?: string | null) {
  if (availability === "si_hay") return "#16a34a";
  if (availability === "no_hay") return "#e11d48";
  return "#f59e0b";
}

function availabilityLabel(value?: string | null) {
  if (value === "si_hay") return "Sí hay";
  if (value === "no_hay") return "No hay";
  return "Sin dato";
}

export function MapView({ stations }: Props) {
  const withCoords = stations.filter(
    (station) =>
      typeof station.latitude === "number" &&
      typeof station.longitude === "number"
  );

  if (withCoords.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        No hay coordenadas suficientes para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="h-[360px] overflow-hidden rounded-[28px] border border-slate-200 shadow-sm">
      <MapContainer
        center={[-16.5, -68.13]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
              <div className="min-w-[180px] space-y-1 text-sm">
                <div className="font-semibold">{station.name}</div>
                <div>Zona: {station.zone ?? "Sin zona"}</div>
                <div>Disponibilidad: {availabilityLabel(station.latestReport?.availability_status)}</div>
                <div>Combustible: {station.latestReport?.fuel_type ?? "Sin dato"}</div>
                <div>Fila: {station.latestReport?.queue_status ?? "Sin dato"}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
