"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const LeafletPickerMap = dynamic(
  () => import("@/components/admin/station-location-picker-map"),
  { ssr: false }
);

type Props = {
  latitude: string;
  longitude: string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
};

export function StationLocationPicker({
  latitude,
  longitude,
  onChange,
}: Props) {
  const parsed = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  }, [latitude, longitude]);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Ubicación manual en mapa
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Haz clic en el mapa para fijar el punto o arrastra el marcador para
          ajustar la ubicación exacta.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="h-[320px] w-full">
          <LeafletPickerMap
            latitude={parsed.lat}
            longitude={parsed.lng}
            onChange={(coords) =>
              onChange({
                latitude: coords.latitude.toFixed(6),
                longitude: coords.longitude.toFixed(6),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">Latitud:</span>{" "}
          {parsed.lat != null ? parsed.lat.toFixed(6) : "-"}
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">Longitud:</span>{" "}
          {parsed.lng != null ? parsed.lng.toFixed(6) : "-"}
        </div>
      </div>
    </div>
  );
}

export default StationLocationPicker;
