"use client";

import dynamic from "next/dynamic";
import type { StationWithLatest, UserLocation } from "@/lib/types";

const DynamicMap = dynamic(
  () => import("@/components/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
  }
);

export function MapShell({
  stations,
  userLocation = null,
  distances,
}: {
  stations: StationWithLatest[];
  userLocation?: UserLocation | null;
  distances?: Record<number, number | null>;
}) {
  const stationsWithDistance = stations.map((station) => ({
    ...station,
    distanceKm:
      station.distanceKm ??
      (distances ? distances[station.id] ?? null : null),
  }));

  return (
    <DynamicMap
      stations={stationsWithDistance}
      userLocation={userLocation ?? null}
      selectedStationId={null}
      onSelectStation={() => {}}
    />
  );
}

export default MapShell;
