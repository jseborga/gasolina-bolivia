"use client";

import dynamic from "next/dynamic";
import type { StationWithLatest } from "@/lib/types";

const DynamicMap = dynamic(
  () => import("@/components/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-slate-500 shadow-sm">
        Cargando mapa...
      </div>
    ),
  }
);

export function MapShell({ stations }: { stations: StationWithLatest[] }) {
  return <DynamicMap stations={stations} />;
}
