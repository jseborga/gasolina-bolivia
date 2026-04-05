"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseMapsInput, type ParsedMapsInput } from "@/lib/google-maps";
import type { StationAdminInput, StationAdminRow } from "@/lib/admin-types";
import { StationLocationPicker } from "@/components/admin/station-location-picker";

type Props = {
  initial?: Partial<StationAdminRow>;
  mode: "create" | "edit";
  stationId?: number;
};

const CREATE_BASE_STATE = {
  address: "",
  city: "La Paz",
  fuel_diesel: true,
  fuel_especial: true,
  fuel_gnv: false,
  fuel_premium: false,
  is_active: true,
  is_verified: false,
  latitude: "",
  license_code: "",
  longitude: "",
  maps_input: "",
  name: "",
  notes: "",
  source_url: "",
  zone: "",
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

function buildResolveMessage(parsed: ParsedMapsInput) {
  if (parsed.latitude != null && parsed.longitude != null) {
    switch (parsed.matchSource) {
      case "redirect":
        return "Coordenadas extraídas desde el enlace resuelto.";
      case "html":
        return "Coordenadas detectadas dentro de la página de Google Maps.";
      default:
        return "Coordenadas detectadas y cargadas en el formulario.";
    }
  }

  if (parsed.sourceUrl) {
    return "Se guardó el enlace, pero no se pudieron obtener coordenadas automáticamente.";
  }

  if (parsed.address) {
    return "Se cargó la dirección. Si falta el punto, ajústalo manualmente en el mapa.";
  }

  return "No se encontró información útil en el texto pegado.";
}

export function StationForm({ initial, mode, stationId }: Props) {
  const router = useRouter();
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
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseMapsInput(form.maps_input), [form.maps_input]);

  const applyParsedToForm = (parsed: ParsedMapsInput) => {
    setForm((prev) => ({
      ...prev,
      address: parsed.address || prev.address,
      latitude: parsed.latitude != null ? parsed.latitude.toFixed(6) : prev.latitude,
      longitude: parsed.longitude != null ? parsed.longitude.toFixed(6) : prev.longitude,
      source_url: parsed.sourceUrl || prev.source_url,
    }));
  };

  const applyMapsInput = async () => {
    const input = form.maps_input.trim();
    if (!input) {
      setError("Pega una URL, dirección o coordenadas.");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);

    const localParsed = parseMapsInput(input);
    let finalParsed = localParsed;
    let fallbackMessage: string | null = null;

    if (localParsed.sourceUrl) {
      setResolving(true);
      try {
        const res = await fetch("/api/admin/maps/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });

        const json = (await res.json()) as ParsedMapsInput & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || "No se pudo resolver el enlace.");
        }

        finalParsed = json;
      } catch (err) {
        if (localParsed.latitude != null && localParsed.longitude != null) {
          fallbackMessage =
            "Se usaron las coordenadas detectadas localmente, pero no se pudo resolver el enlace completo.";
        } else {
          setError(err instanceof Error ? err.message : "No se pudo resolver el enlace.");
          setResolving(false);
          return;
        }
      } finally {
        setResolving(false);
      }
    }

    applyParsedToForm(finalParsed);

    if (fallbackMessage) {
      setMessage(fallbackMessage);
      return;
    }

    if (finalParsed.latitude == null || finalParsed.longitude == null) {
      setError("No se encontraron coordenadas automáticas. Usa el mapa para fijar el punto.");
    }

    setMessage(buildResolveMessage(finalParsed));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const latitudeValue = form.latitude.trim();
    const longitudeValue = form.longitude.trim();

    if ((latitudeValue && !longitudeValue) || (!latitudeValue && longitudeValue)) {
      setSaving(false);
      setError("Debes completar latitud y longitud juntas.");
      return;
    }

    const latitude = latitudeValue ? Number(latitudeValue) : null;
    const longitude = longitudeValue ? Number(longitudeValue) : null;

    if (
      (latitudeValue && !Number.isFinite(latitude ?? Number.NaN)) ||
      (longitudeValue && !Number.isFinite(longitude ?? Number.NaN))
    ) {
      setSaving(false);
      setError("Las coordenadas deben ser numéricas.");
      return;
    }

    const payload: StationAdminInput = {
      name: form.name.trim(),
      zone: form.zone.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      latitude,
      longitude,
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

      if (mode === "create") {
        setForm({ ...CREATE_BASE_STATE });
        router.replace(
          `/admin/stations/new?created=1&name=${encodeURIComponent(payload.name)}`
        );
        router.refresh();
        return;
      }

      setMessage("Estación actualizada.");
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
          Puedes pegar una dirección, coordenadas o una URL de Google Maps. Si
          la URL es corta o redirige, el sistema intenta resolverla antes de
          completar el punto.
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
          <button
            type="button"
            onClick={applyMapsInput}
            disabled={resolving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {resolving ? "Resolviendo enlace..." : "Analizar y completar"}
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
