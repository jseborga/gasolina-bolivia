"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { getTrafficIncidentLabel, getTrafficIncidentRadiusLabel } from "@/lib/traffic-incidents";
import type {
  AnalyticsActivityPoint,
  AnalyticsHeatPoint,
  AnalyticsIncidentPoint,
  AnalyticsStationPoint,
} from "@/components/admin/admin-analytics-map";

type LayerKey = "activity" | "heat" | "incidents" | "stations";

type Props = {
  activeLayer: LayerKey;
  activityPoints: AnalyticsActivityPoint[];
  heatPoints: AnalyticsHeatPoint[];
  incidentPoints: AnalyticsIncidentPoint[];
  stationPoints: AnalyticsStationPoint[];
};

const defaultCenter: [number, number] = [-16.5, -68.15];

function getActivityColor(source: AnalyticsActivityPoint["source"]) {
  switch (source) {
    case "station_review":
      return "#2563eb";
    case "service_review":
      return "#0f766e";
    case "traffic_incident":
      return "#f59e0b";
    case "place_report":
    default:
      return "#dc2626";
  }
}

function getHeatColor(normalized: number) {
  if (normalized >= 0.8) return "#dc2626";
  if (normalized >= 0.55) return "#f97316";
  if (normalized >= 0.3) return "#f59e0b";
  return "#38bdf8";
}

function getStationColor(status: AnalyticsStationPoint["availabilityStatus"]) {
  switch (status) {
    case "si_hay":
      return "#16a34a";
    case "no_hay":
      return "#e11d48";
    case "sin_dato":
    default:
      return "#64748b";
  }
}

function getStationStatusLabel(status: AnalyticsStationPoint["availabilityStatus"]) {
  switch (status) {
    case "si_hay":
      return "Disponible";
    case "no_hay":
      return "Sin combustible";
    case "sin_dato":
    default:
      return "Sin dato";
  }
}

function getQueueLabel(value: string | null) {
  switch (value) {
    case "corta":
      return "Fila corta";
    case "media":
      return "Fila media";
    case "larga":
      return "Fila larga";
    default:
      return "Fila sin dato";
  }
}

function getIncidentColor(type: string) {
  switch (type) {
    case "control_vial":
      return "#f59e0b";
    case "corte_via":
      return "#ef4444";
    case "marcha":
      return "#8b5cf6";
    case "accidente":
      return "#fb7185";
    case "derrumbe":
      return "#92400e";
    default:
      return "#64748b";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function FitToLayer({
  activeLayer,
  activityPoints,
  heatPoints,
  incidentPoints,
  stationPoints,
}: Props) {
  const map = useMap();

  const points = useMemo(() => {
    switch (activeLayer) {
      case "activity":
        return activityPoints.map((point) => [point.latitude, point.longitude] as [number, number]);
      case "heat":
        return heatPoints.map((point) => [point.latitude, point.longitude] as [number, number]);
      case "incidents":
        return incidentPoints.map((point) => [point.latitude, point.longitude] as [number, number]);
      case "stations":
      default:
        return stationPoints.map((point) => [point.latitude, point.longitude] as [number, number]);
    }
  }, [activeLayer, activityPoints, heatPoints, incidentPoints, stationPoints]);

  useEffect(() => {
    if (points.length === 0) {
      map.setView(defaultCenter, 12, { animate: true });
      return;
    }

    if (points.length === 1) {
      map.flyTo(points[0], 14, { animate: true, duration: 0.6 });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.18), { animate: true });
  }, [map, points]);

  return null;
}

export default function AdminAnalyticsMapView({
  activeLayer,
  activityPoints,
  heatPoints,
  incidentPoints,
  stationPoints,
}: Props) {
  const center: [number, number] =
    activityPoints[0] != null
      ? [activityPoints[0].latitude, activityPoints[0].longitude]
      : heatPoints[0] != null
        ? [heatPoints[0].latitude, heatPoints[0].longitude]
        : stationPoints[0] != null
          ? [stationPoints[0].latitude, stationPoints[0].longitude]
          : defaultCenter;

  const maxHeatIntensity = Math.max(
    1,
    ...heatPoints.map((point) => Math.max(1, point.intensity))
  );
  const maxStationReports = Math.max(
    1,
    ...stationPoints.map((point) => Math.max(1, point.reportCount))
  );

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <FitToLayer
        activeLayer={activeLayer}
        activityPoints={activityPoints}
        heatPoints={heatPoints}
        incidentPoints={incidentPoints}
        stationPoints={stationPoints}
      />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {activeLayer === "activity"
        ? activityPoints.map((point) => {
            const color = getActivityColor(point.source);

            return (
              <CircleMarker
                key={point.id}
                center={[point.latitude, point.longitude]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.82,
                  weight: 2,
                }}
                radius={7}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{point.title}</div>
                    <div>{point.subtitle}</div>
                    <div>{formatDateTime(point.createdAt)}</div>
                    <div>IP: {point.ipAddress || "-"}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })
        : null}

      {activeLayer === "heat"
        ? heatPoints.map((point) => {
            const normalized = Math.max(0.1, point.intensity / maxHeatIntensity);
            const color = getHeatColor(normalized);

            return (
              <Circle
                key={point.id}
                center={[point.latitude, point.longitude]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.12 + normalized * 0.28,
                  weight: 1,
                }}
                radius={100 + normalized * 420}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{point.label}</div>
                    <div>{point.reportCount} reportes recientes</div>
                    <div>{formatDateTime(point.latestAt)}</div>
                  </div>
                </Tooltip>
              </Circle>
            );
          })
        : null}

      {activeLayer === "incidents"
        ? incidentPoints.map((point) => {
            const color = getIncidentColor(point.incidentType);

            return (
              <Circle
                key={point.id}
                center={[point.latitude, point.longitude]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.12,
                  weight: 2,
                }}
                radius={point.radiusMeters}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">
                      {getTrafficIncidentLabel(point.incidentType as never)}
                    </div>
                    <div>{point.description || "Sin detalle"}</div>
                    <div>{getTrafficIncidentRadiusLabel(point.radiusMeters)}</div>
                    <div>
                      Confirmaciones: {point.confirmationCount} | Rechazos: {point.rejectionCount}
                    </div>
                    <div>{formatDateTime(point.createdAt)}</div>
                  </div>
                </Tooltip>
              </Circle>
            );
          })
        : null}

      {activeLayer === "stations"
        ? stationPoints.map((point) => {
            const color = getStationColor(point.availabilityStatus);
            const normalized = Math.max(0.1, point.reportCount / maxStationReports);

            return (
              <CircleMarker
                key={point.id}
                center={[point.latitude, point.longitude]}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: point.isActive ? 0.85 : 0.35,
                  weight: point.isVerified ? 3 : 2,
                }}
                radius={7 + normalized * 6}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{point.label}</div>
                    <div>{point.zone}</div>
                    <div>{getStationStatusLabel(point.availabilityStatus)}</div>
                    <div>{getQueueLabel(point.queueStatus)}</div>
                    <div>Reportes: {point.reportCount}</div>
                    <div>{formatDateTime(point.updatedAt)}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })
        : null}
    </MapContainer>
  );
}
