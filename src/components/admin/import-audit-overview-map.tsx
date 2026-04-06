"use client";

import dynamic from "next/dynamic";
import type { StationImportAuditItem } from "@/lib/admin-types";

const ImportAuditOverviewMapView = dynamic(
  () => import("@/components/admin/import-audit-overview-map-view"),
  {
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando mapa...
      </div>
    ),
    ssr: false,
  }
);

type Props = {
  items: StationImportAuditItem[];
  onSelectId?: (id: number) => void;
  selectedId?: number | null;
};

export function ImportAuditOverviewMap({ items, onSelectId, selectedId }: Props) {
  const points = items
    .filter((item) => item.station.latitude != null && item.station.longitude != null)
    .map((item) => ({
      distanceKm: item.verification.distanceKm,
      id: item.station.id,
      label: item.station.name,
      latitude: item.station.latitude as number,
      longitude: item.station.longitude as number,
      status: item.verification.status,
      zone: item.station.zone || item.station.city || "Sin zona",
    }));

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No hay coordenadas suficientes para mostrar el lote en el mapa.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Vista masiva en mapa</h3>
        <p className="mt-1 text-sm text-slate-500">
          Verde: coherente. Amarillo: revisar. Gris: parcial. Haz clic en un punto
          para enfocar la tarjeta de esa estacion.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="h-[360px] w-full">
          <ImportAuditOverviewMapView
            onSelectId={onSelectId}
            points={points}
            selectedId={selectedId ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default ImportAuditOverviewMap;
