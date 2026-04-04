import type { UserLocation } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatDistanceKm(distanceKm?: number | null) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

export function distanceFromUser(
  userLocation: UserLocation | null,
  latitude?: number | null,
  longitude?: number | null
) {
  if (
    !userLocation ||
    latitude == null ||
    longitude == null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }

  return haversineDistanceKm(
    userLocation.latitude,
    userLocation.longitude,
    latitude,
    longitude
  );
}
