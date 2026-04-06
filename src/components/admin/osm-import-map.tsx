"use client";

import dynamic from "next/dynamic";
import type { OSMImportMapPoint } from "@/components/admin/osm-import-map-view";

const OSMImportMapView = dynamic(
  () => import("@/components/admin/osm-import-map-view"),
  {
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando mapa...
      </div>
    ),
    ssr: false,
  }
);

type Props = {
  incoming?: { latitude: number | null; longitude: number | null } | null;
  match?: { latitude: number | null; longitude: number | null } | null;
};

function toPoint(
  input: { latitude: number | null; longitude: number | null } | null | undefined,
  label: string,
  color: string
): OSMImportMapPoint | null {
  if (input?.latitude == null || input.longitude == null) return null;

  return {
    color,
    label,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export function OSMImportMap({ incoming, match }: Props) {
  const incomingPoint = toPoint(incoming, "Candidato OSM", "#059669");
  const matchPoint = toPoint(match, "Coincidencia actual", "#0f172a");

  if (!incomingPoint && !matchPoint) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No hay coordenadas suficientes para mostrar el preview en mapa.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Aprobación en mapa</h4>
        <p className="mt-1 text-xs text-slate-500">
          Verde: punto importado desde OSM. Negro: registro actual en tu base.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="h-[320px] w-full">
          <OSMImportMapView incoming={incomingPoint} match={matchPoint} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        {incomingPoint ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            OSM {incomingPoint.latitude.toFixed(6)}, {incomingPoint.longitude.toFixed(6)}
          </span>
        ) : null}
        {matchPoint ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            Base {matchPoint.latitude.toFixed(6)}, {matchPoint.longitude.toFixed(6)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default OSMImportMap;
