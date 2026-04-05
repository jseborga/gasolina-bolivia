"use client";

import { useMemo, useState } from "react";
import { parseMapsInput } from "@/lib/google-maps";
import type { StationAdminInput, StationAdminRow } from "@/lib/admin-types";
import { StationLocationPicker } from "@/components/admin/station-location-picker";

type Props = {
  initial?: Partial<StationAdminRow>;
  mode: "create" | "edit";
  stationId?: number;
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

export function StationForm({ initial, mode, stationId }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    zone: initial?.zone ?? "",
    city: initial?.city ?? "La Paz",
    address: initial?.address ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    fuel_especial: initial?.fuel_especial ?? true,
    fuel_premium: initial?.fuel_premium ?? false,
    fuel_diesel: initial?.fuel_diesel ?? true,
    fuel_gnv: initial?.fuel_gnv ?? false,
    is_active: initial?.is_active ?? true,
    is_verified: initial?.is_verified ?? false,
    source_url: initial?.source_url ?? "",
    notes: initial?.notes ?? "",
    license_code: initial?.license_code ?? "",
    maps_input: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseMapsInput(form.maps_input), [form.maps_input]);

  const applyMapsInput = () => {
    const parsed = parseMapsInput(form.maps_input);
    setForm((prev) => ({
      ...prev,
      address: parsed.address || prev.address,
      latitude: parsed.latitude != null ? String(parsed.latitude) : prev.latitude,
      longitude: parsed.longitude != null ? String(parsed.longitude) : prev.longitude,
      source_url: parsed.sourceUrl || prev.source_url,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: StationAdminInput = {
      name: form.name.trim(),
      zone: form.zone.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      fuel_especial: form.fuel_especial,
      fuel_premium: form.fuel_premium,
      fuel_diesel: form.fuel_diesel,
      fuel_gnv: form.fuel_gnv,
      is_active: form.is_active,
      is_verified: form.is_verified,
      source_url: form.source_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      license_code: form.license_code.trim() || undefined,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/stations" : `/api/admin/stations/${stationId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");

      setMessage(mode === "create" ? "Estación creada." : "Estación actualizada.");
      if (mode === "create") {
        setForm((prev) => ({ ...prev, notes: "", maps_input: "" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "create" ? "Nueva estación" : "Editar estación"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Puedes pegar una dirección, coordenadas o una URL de Google Maps. Si la URL incluye coordenadas, el sistema las extrae automáticamente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input className={fieldClass()} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Zona</span>
          <input className={fieldClass()} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Ciudad</span>
          <input className={fieldClass()} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Código / licencia</span>
          <input className={fieldClass()} value={form.license_code} onChange={(e) => setForm({ ...form, license_code: e.target.value })} />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Pega dirección, coordenadas o URL de Google Maps</span>
          <textarea className={fieldClass()} value={form.maps_input} onChange={(e) => setForm({ ...form, maps_input: e.target.value })} rows={3} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={applyMapsInput} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Analizar y completar
          </button>
          <span className="text-xs text-slate-500">
            Detectado: lat {parsedPreview.latitude ?? "-"} / lng {parsedPreview.longitude ?? "-"}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Dirección</span>
        <input className={fieldClass()} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Latitud</span>
          <input className={fieldClass()} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Longitud</span>
          <input className={fieldClass()} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
        </label>
      </div>

      <StationLocationPicker
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={({ latitude, longitude }) =>
          setForm((prev) => ({
            ...prev,
            latitude,
            longitude,
          }))
        }
      />

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">URL de origen</span>
        <input className={fieldClass()} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["fuel_especial", "Especial"],
          ["fuel_premium", "Premium"],
          ["fuel_diesel", "Diésel"],
          ["fuel_gnv", "GNV"],
          ["is_active", "Activa"],
          ["is_verified", "Verificada"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={(form as Record<string, boolean | string>)[key] as boolean}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Notas</span>
        <textarea className={fieldClass()} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? "Guardando..." : mode === "create" ? "Crear estación" : "Guardar cambios"}
        </button>
        {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </form>
  );
}

export default StationForm;
