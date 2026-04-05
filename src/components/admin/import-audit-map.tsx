"use client";

import dynamic from "next/dynamic";
import type { ImportAuditMapPoint } from "@/components/admin/import-audit-map-view";

const ImportAuditMapView = dynamic(
  () => import("@/components/admin/import-audit-map-view"),
  {
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando mapa...
      </div>
    ),
    ssr: false,
  }
);

type Props = {
  adjusted?: { latitude: number; longitude: number } | null;
  current?: { latitude: number | null; longitude: number | null } | null;
  suggested?: { latitude: number; longitude: number } | null;
};

function toPoint(
  input: { latitude: number | null; longitude: number | null } | null | undefined,
  label: string,
  color: string
): ImportAuditMapPoint | null {
  if (input?.latitude == null || input.longitude == null) {
    return null;
  }

  return {
    color,
    label,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export function ImportAuditMap({ adjusted, current, suggested }: Props) {
  const currentPoint = toPoint(current ?? null, "Punto actual", "#0f172a");
  const suggestedPoint = toPoint(suggested ?? null, "Punto sugerido", "#059669");
  const adjustedPoint = toPoint(adjusted ?? null, "Punto con offset", "#d97706");

  if (!currentPoint && !suggestedPoint && !adjustedPoint) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No hay coordenadas suficientes para mostrar comparacion en mapa.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Comparacion visual</h4>
        <p className="mt-1 text-xs text-slate-500">
          Negro: punto actual. Verde: punto sugerido por direccion. Naranja:
          correccion estimada por offset.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="h-[280px] w-full">
          <ImportAuditMapView
            adjusted={adjustedPoint}
            current={currentPoint}
            suggested={suggestedPoint}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        {currentPoint ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1">
            Actual {currentPoint.latitude.toFixed(6)}, {currentPoint.longitude.toFixed(6)}
          </span>
        ) : null}
        {suggestedPoint ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            Sugerido {suggestedPoint.latitude.toFixed(6)}, {suggestedPoint.longitude.toFixed(6)}
          </span>
        ) : null}
        {adjustedPoint ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            Offset {adjustedPoint.latitude.toFixed(6)}, {adjustedPoint.longitude.toFixed(6)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default ImportAuditMap;
