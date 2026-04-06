"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";

type OverviewPoint = {
  distanceKm: number | null;
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  status: "missing" | "ok" | "warning";
  zone: string;
};

type Props = {
  onSelectId?: (id: number) => void;
  points: OverviewPoint[];
  selectedId: number | null;
};

const defaultCenter: [number, number] = [-16.5, -68.15];

function getPointColor(status: OverviewPoint["status"]) {
  switch (status) {
    case "ok":
      return "#16a34a";
    case "warning":
      return "#d97706";
    case "missing":
    default:
      return "#64748b";
  }
}

function FitToPoints({ points, selectedId }: { points: OverviewPoint[]; selectedId: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const selected = selectedId ? points.find((point) => point.id === selectedId) : null;
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 13, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [map, points, selectedId]);

  return null;
}

export default function ImportAuditOverviewMapView({
  onSelectId,
  points,
  selectedId,
}: Props) {
  const center: [number, number] = points[0]
    ? [points[0].latitude, points[0].longitude]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <FitToPoints points={points} selectedId={selectedId} />
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.map((point) => {
        const color = getPointColor(point.status);
        const isSelected = point.id === selectedId;

        return (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            eventHandlers={{
              click: () => onSelectId?.(point.id),
            }}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isSelected ? 0.95 : 0.75,
              weight: isSelected ? 4 : 2,
            }}
            radius={isSelected ? 11 : 8}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="space-y-1 text-xs">
                <div className="font-semibold">{point.label}</div>
                <div>{point.zone}</div>
                {point.distanceKm != null ? (
                  <div>Diferencia: {(point.distanceKm * 1000).toFixed(0)} m</div>
                ) : null}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
