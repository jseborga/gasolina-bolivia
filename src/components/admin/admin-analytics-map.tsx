"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const AdminAnalyticsMapView = dynamic(
  () => import("@/components/admin/admin-analytics-map-view"),
  {
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando mapa de analytics...
      </div>
    ),
    ssr: false,
  }
);

export type AnalyticsActivityPoint = {
  createdAt: string;
  id: string;
  ipAddress: string | null;
  latitude: number;
  longitude: number;
  source: "place_report" | "service_review" | "station_review" | "traffic_incident";
  subtitle: string;
  title: string;
  visitorId: string | null;
};

export type AnalyticsHeatPoint = {
  id: string;
  intensity: number;
  label: string;
  latitude: number;
  latestAt: string | null;
  longitude: number;
  reportCount: number;
};

export type AnalyticsIncidentPoint = {
  confirmationCount: number;
  createdAt: string;
  description: string | null;
  id: number;
  incidentType: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  rejectionCount: number;
  status: string;
};

export type AnalyticsStationPoint = {
  availabilityStatus: "no_hay" | "si_hay" | "sin_dato" | null;
  fuelType: string | null;
  id: number;
  isActive: boolean;
  isVerified: boolean;
  label: string;
  latitude: number;
  longitude: number;
  queueStatus: string | null;
  reportCount: number;
  updatedAt: string | null;
  zone: string;
};

type LayerKey = "activity" | "heat" | "incidents" | "stations";

type Props = {
  activityPoints: AnalyticsActivityPoint[];
  heatPoints: AnalyticsHeatPoint[];
  incidentPoints: AnalyticsIncidentPoint[];
  stationPoints: AnalyticsStationPoint[];
};

const LAYER_LABELS: Record<LayerKey, string> = {
  activity: "Nodos recientes",
  heat: "Calor de reportes",
  incidents: "Incidentes recientes",
  stations: "Gasolineras por color",
};

function getInitialLayer({
  activityPoints,
  heatPoints,
  incidentPoints,
  stationPoints,
}: Props): LayerKey {
  if (activityPoints.length > 0) return "activity";
  if (heatPoints.length > 0) return "heat";
  if (incidentPoints.length > 0) return "incidents";
  return "stations";
}

export function AdminAnalyticsMap(props: Props) {
  const [activeLayer, setActiveLayer] = useState<LayerKey>(() => getInitialLayer(props));

  const layerCounts = useMemo(
    () => ({
      activity: props.activityPoints.length,
      heat: props.heatPoints.length,
      incidents: props.incidentPoints.length,
      stations: props.stationPoints.length,
    }),
    [props.activityPoints.length, props.heatPoints.length, props.incidentPoints.length, props.stationPoints.length]
  );

  const layerDescription =
    activeLayer === "activity"
      ? "Los nodos usan coordenadas reales reportadas por visitantes o buckets de ubicacion. La IP se muestra como referencia operativa."
      : activeLayer === "heat"
        ? "El calor se calcula con reportes recientes agrupados por gasolinera con coordenadas validas."
        : activeLayer === "incidents"
          ? "Los circulos muestran el radio de afectacion de los incidentes reportados recientemente."
          : "Color de gasolineras segun el ultimo estado reportado: verde disponible, rojo sin combustible, gris sin dato.";

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mapa operativo</h2>
          <p className="mt-1 text-sm text-slate-500">{layerDescription}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(LAYER_LABELS) as LayerKey[]).map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => setActiveLayer(layer)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeLayer === layer
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {LAYER_LABELS[layer]} ({layerCounts[layer]})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="h-[460px] w-full">
          <AdminAnalyticsMapView
            activeLayer={activeLayer}
            activityPoints={props.activityPoints}
            heatPoints={props.heatPoints}
            incidentPoints={props.incidentPoints}
            stationPoints={props.stationPoints}
          />
        </div>
      </div>
    </section>
  );
}

export default AdminAnalyticsMap;
