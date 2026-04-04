"use client";

import dynamic from "next/dynamic";
import type { StationWithLatest, UserLocation } from "@/lib/types";

const DynamicMap = dynamic(
  () => import("@/components/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-500 shadow-sm">
        Cargando mapa...
      </div>
    ),
  }
);

export function MapShell({
  stations,
  userLocation,
  distances,
}: {
  stations: StationWithLatest[];
  userLocation?: UserLocation | null;
  distances?: Record<number, number | null>;
}) {
  return <DynamicMap stations={stations} userLocation={userLocation} distances={distances} />;
}
