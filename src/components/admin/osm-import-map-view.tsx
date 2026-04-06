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

export type OSMImportMapPoint = {
  color: string;
  label: string;
  latitude: number;
  longitude: number;
};

type Props = {
  incoming: OSMImportMapPoint | null;
  match: OSMImportMapPoint | null;
};

const defaultCenter: [number, number] = [-16.5, -68.15];

function FitToPoints({ points }: { points: OSMImportMapPoint[] }) {
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

export default function OSMImportMapView({ incoming, match }: Props) {
  const points = useMemo(
    () => [incoming, match].filter(Boolean) as OSMImportMapPoint[],
    [incoming, match]
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

      {incoming && match ? (
        <Polyline
          positions={[
            [incoming.latitude, incoming.longitude],
            [match.latitude, match.longitude],
          ]}
          pathOptions={{ color: "#64748b", dashArray: "6 6", weight: 2 }}
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
