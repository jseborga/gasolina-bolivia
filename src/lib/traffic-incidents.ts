import type { TrafficIncidentType } from "@/lib/types";

export const VALID_TRAFFIC_INCIDENT_TYPES: TrafficIncidentType[] = [
  "control_vial",
  "corte_via",
  "marcha",
  "accidente",
  "derrumbe",
  "otro",
];

const TRAFFIC_INCIDENT_LABELS: Record<TrafficIncidentType, string> = {
  accidente: "Accidente",
  control_vial: "Control vial",
  corte_via: "Corte de via",
  derrumbe: "Derrumbe",
  marcha: "Marcha",
  otro: "Incidente",
};

export const DEFAULT_TRAFFIC_INCIDENT_DURATION_BY_TYPE: Record<TrafficIncidentType, number> = {
  accidente: 120,
  control_vial: 60,
  corte_via: 180,
  derrumbe: 360,
  marcha: 240,
  otro: 120,
};

export const TRAFFIC_INCIDENT_DURATION_OPTIONS = [30, 60, 120, 240, 360] as const;

export const DEFAULT_TRAFFIC_INCIDENT_RADIUS_BY_TYPE: Record<TrafficIncidentType, number> = {
  accidente: 120,
  control_vial: 120,
  corte_via: 240,
  derrumbe: 400,
  marcha: 400,
  otro: 120,
};

export const TRAFFIC_INCIDENT_RADIUS_OPTIONS = [120, 240, 400, 800] as const;

export function getTrafficIncidentLabel(type: TrafficIncidentType) {
  return TRAFFIC_INCIDENT_LABELS[type] ?? "Incidente";
}

export function getTrafficIncidentDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export function getDefaultTrafficIncidentRadiusMeters(type: TrafficIncidentType) {
  return DEFAULT_TRAFFIC_INCIDENT_RADIUS_BY_TYPE[type] ?? 120;
}

export function getTrafficIncidentRadiusLabel(radiusMeters: number) {
  if (radiusMeters <= 140) return "1 cuadra";
  if (radiusMeters <= 260) return "2 cuadras";
  if (radiusMeters <= 450) return "3-4 cuadras";
  if (radiusMeters <= 900) return "zona amplia";
  return `${Math.round(radiusMeters)} m`;
}

export function normalizeTrafficIncidentDurationMinutes(
  value: unknown,
  incidentType: TrafficIncidentType
) {
  const parsed = typeof value === "number" ? value : Number(value);
  const fallback = DEFAULT_TRAFFIC_INCIDENT_DURATION_BY_TYPE[incidentType] ?? 120;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed);
  return Math.min(720, Math.max(15, rounded));
}

export function normalizeTrafficIncidentRadiusMeters(
  value: unknown,
  incidentType: TrafficIncidentType
) {
  const parsed = typeof value === "number" ? value : Number(value);
  const fallback = getDefaultTrafficIncidentRadiusMeters(incidentType);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed);
  return Math.min(3000, Math.max(100, rounded));
}
