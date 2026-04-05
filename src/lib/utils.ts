export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getSortDateValue(date?: string | null): number {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function matchesFuelFilter(
  fuelType: string | null | undefined,
  fuelFilter: string
): boolean {
  if (fuelFilter === "all") return true;
  return fuelType === fuelFilter;
}

export function normalizeStatusForSort(
  status?: string | null
): number {
  switch (status) {
    case "si_hay":
      return 0;
    case "sin_dato":
      return 1;
    case "no_hay":
      return 2;
    default:
      return 3;
  }
}

export function queueSortValue(
  queue?: string | null
): number {
  switch (queue) {
    case "corta":
      return 0;
    case "media":
      return 1;
    case "larga":
      return 2;
    case "sin_dato":
      return 3;
    default:
      return 4;
  }
}

export function getFreshnessLabel(createdAt?: string | null): string {
  if (!createdAt) return "Sin reporte";

  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "Fecha inválida";

  const diffMs = Date.now() - created;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Hace menos de 1 min";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}
