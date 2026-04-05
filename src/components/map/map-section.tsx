"use client";

import dynamic from "next/dynamic";
import { StationWithLatest } from "@/lib/types";

const MapClient = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Cargando mapa...</div>,
});

export function MapSection({
  stations,
  userLocation,
}: {
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  userLocation: { latitude: number; longitude: number } | null;
}) {
  return <MapClient stations={stations} userLocation={userLocation} />;
}
