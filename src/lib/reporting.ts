import type {
  AvailabilityStatus,
  FuelType,
  QueueStatus,
  Report,
  StationWithLatest,
} from "@/lib/types";

export function getFuelLabel(fuel?: FuelType | null): string {
  switch (fuel) {
    case "especial":
      return "Especial";
    case "premium":
      return "Premium";
    case "diesel":
      return "Diésel";
    default:
      return "Sin dato";
  }
}

export function getAvailabilityLabel(status?: AvailabilityStatus | null): string {
  switch (status) {
    case "si_hay":
      return "Sí hay";
    case "no_hay":
      return "No hay";
    case "sin_dato":
    default:
      return "Sin dato";
  }
}

export function getQueueLabel(queue?: QueueStatus | null): string {
  switch (queue) {
    case "corta":
      return "Fila corta";
    case "media":
      return "Fila media";
    case "larga":
      return "Fila larga";
    case "sin_dato":
    default:
      return "Sin dato";
  }
}

/* Alias para compatibilidad */
export const formatFuelType = getFuelLabel;
export const formatAvailability = getAvailabilityLabel;
export const formatQueue = getQueueLabel;

export function formatRelativeTime(createdAt?: string | null): string {
  if (!createdAt) return "Sin reporte";

  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return "Fecha inválida";

  const diffMs = Date.now() - time;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Hace menos de 1 min";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function getFreshness(createdAt?: string | null): "fresh" | "aging" | "stale" | "none" {
  if (!createdAt) return "none";

  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return "none";

  const diffMin = Math.floor((Date.now() - time) / 60000);

  if (diffMin <= 30) return "fresh";
  if (diffMin <= 90) return "aging";
  return "stale";
}

export function isRecentReport(createdAt?: string | null, maxMinutes = 90): boolean {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= maxMinutes * 60 * 1000;
}

export function getLatestReportForStation(
  stationId: number,
  reports: Report[]
): Report | null {
  const filtered = reports
    .filter((report) => report.station_id === stationId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return filtered[0] ?? null;
}

export function attachLatestReports(
  stations: StationWithLatest[],
  reports: Report[]
): StationWithLatest[] {
  return stations.map((station) => ({
    ...station,
    latestReport: getLatestReportForStation(station.id, reports),
  }));
}
