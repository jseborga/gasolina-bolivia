"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

export type ImportAuditMapPoint = {
  color: string;
  label: string;
  latitude: number;
  longitude: number;
};

type Props = {
  adjusted: ImportAuditMapPoint | null;
  current: ImportAuditMapPoint | null;
  suggested: ImportAuditMapPoint | null;
};

const defaultCenter: [number, number] = [-16.5, -68.15];

function FitToPoints({ points }: { points: ImportAuditMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.35), { animate: true });
  }, [map, points]);

  return null;
}

export default function ImportAuditMapView({
  adjusted,
  current,
  suggested,
}: Props) {
  const points = useMemo(
    () => [current, suggested, adjusted].filter(Boolean) as ImportAuditMapPoint[],
    [adjusted, current, suggested]
  );

  const center: [number, number] = points[0]
    ? [points[0].latitude, points[0].longitude]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <FitToPoints points={points} />
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {current && suggested ? (
        <Polyline
          positions={[
            [current.latitude, current.longitude],
            [suggested.latitude, suggested.longitude],
          ]}
          pathOptions={{ color: "#64748b", dashArray: "6 6", weight: 2 }}
        />
      ) : null}

      {adjusted && suggested ? (
        <Polyline
          positions={[
            [adjusted.latitude, adjusted.longitude],
            [suggested.latitude, suggested.longitude],
          ]}
          pathOptions={{ color: "#d97706", dashArray: "4 8", opacity: 0.75, weight: 2 }}
        />
      ) : null}

      {points.map((point) => (
        <CircleMarker
          key={`${point.label}-${point.latitude}-${point.longitude}`}
          center={[point.latitude, point.longitude]}
          radius={8}
          pathOptions={{
            color: point.color,
            fillColor: point.color,
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {point.label}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
