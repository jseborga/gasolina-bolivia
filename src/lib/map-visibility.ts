import type { TrafficIncident, UserLocation } from "@/lib/types";
import { haversineKm } from "@/lib/utils";

export const PUBLIC_DISCOVERY_RADIUS_KM = 5;
export const PUBLIC_DISCOVERY_LIMIT = 14;
export const MIN_PUBLIC_INCIDENT_RADIUS_METERS = 120;
export const PUBLIC_NEARBY_INCIDENT_LIMIT = 5;

type DistanceCandidate = {
  distanceKm?: number | null;
};

export function limitItemsToNearby<T extends DistanceCandidate>(
  items: T[],
  options?: {
    limit?: number;
    maxDistanceKm?: number;
  }
) {
  const limit = options?.limit ?? PUBLIC_DISCOVERY_LIMIT;
  const maxDistanceKm = options?.maxDistanceKm ?? PUBLIC_DISCOVERY_RADIUS_KM;

  const withDistance = items.filter(
    (item): item is T & { distanceKm: number } =>
      typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm)
  );

  const nearby = withDistance.filter((item) => item.distanceKm <= maxDistanceKm);
  const prioritized = (nearby.length > 0 ? nearby : withDistance).slice().sort((a, b) => {
    return a.distanceKm - b.distanceKm;
  });

  return prioritized.slice(0, limit);
}

export function getNearbyTrafficIncidents(
  trafficIncidents: TrafficIncident[],
  userLocation: UserLocation | null,
  options?: {
    limit?: number;
    minimumRadiusMeters?: number;
  }
) {
  if (!userLocation || trafficIncidents.length === 0) {
    return [];
  }

  const limit = options?.limit ?? PUBLIC_NEARBY_INCIDENT_LIMIT;
  const minimumRadiusMeters =
    options?.minimumRadiusMeters ?? MIN_PUBLIC_INCIDENT_RADIUS_METERS;

  return trafficIncidents
    .map((incident) => {
      const distanceKm = haversineKm(
        userLocation.lat,
        userLocation.lng,
        incident.latitude,
        incident.longitude
      );

      return {
        distanceKm,
        incident,
        isInsideAffectation:
          distanceKm * 1000 <= Math.max(incident.radius_meters, minimumRadiusMeters),
      };
    })
    .filter((item) => item.isInsideAffectation)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
