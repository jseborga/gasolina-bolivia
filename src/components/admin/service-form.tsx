"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseMapsInput, type ParsedMapsInput } from "@/lib/google-maps";
import type { ServiceAdminInput, ServiceAdminRow } from "@/lib/admin-service-types";
import type { StationLocationVerification } from "@/lib/admin-types";
import { SUPPORT_SERVICE_OPTIONS } from "@/lib/services";
import { StationLocationPicker } from "@/components/admin/station-location-picker";

type Props = {
  initial?: Partial<ServiceAdminRow>;
  mode: "create" | "edit";
  serviceId?: number;
};

const CREATE_BASE_STATE = {
  address: "",
  category: "taller_mecanico" as const,
  city: "La Paz",
  description: "",
  is_active: true,
  is_verified: false,
  latitude: "",
  longitude: "",
  maps_input: "",
  name: "",
  notes: "",
  phone: "",
  source_url: "",
  website_url: "",
  whatsapp_number: "",
  zone: "",
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return "Sin distancia";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(2)} km`;
}

export function ServiceForm({ initial, mode, serviceId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "taller_mecanico",
    zone: initial?.zone ?? "",
    city: initial?.city ?? "La Paz",
    address: initial?.address ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    phone: initial?.phone ?? "",
    whatsapp_number: initial?.whatsapp_number ?? "",
    website_url: initial?.website_url ?? "",
    description: initial?.description ?? "",
    is_active: initial?.is_active ?? true,
    is_verified: initial?.is_verified ?? false,
    source_url: initial?.source_url ?? "",
    notes: initial?.notes ?? "",
    maps_input: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<StationLocationVerification | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseMapsInput(form.maps_input), [form.maps_input]);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setVerification(null);
  };

  const applyParsedToForm = (parsed: ParsedMapsInput) => {
    updateForm({
      address: parsed.address || form.address,
      latitude: parsed.latitude != null ? parsed.latitude.toFixed(6) : form.latitude,
      longitude: parsed.longitude != null ? parsed.longitude.toFixed(6) : form.longitude,
      source_url: parsed.sourceUrl || form.source_url,
    });
  };

  const applyMapsInput = async () => {
    const input = form.maps_input.trim();
    if (!input) {
      setError("Pega una URL, dirección o coordenadas.");
      setMessage(null);
      return;
    }

    clearFeedback();
    setVerification(null);

    const localParsed = parseMapsInput(input);
    let finalParsed = localParsed;

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
        if (localParsed.latitude == null || localParsed.longitude == null) {
          setError(err instanceof Error ? err.message : "No se pudo resolver el enlace.");
          setResolving(false);
          return;
        }
      } finally {
        setResolving(false);
      }
    }

    applyParsedToForm(finalParsed);
    setMessage("Ubicación actualizada desde Google Maps.");
  };

  const verifyLocation = async () => {
    setVerifying(true);
    clearFeedback();

    try {
      const res = await fetch("/api/admin/maps/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address.trim(),
          latitude: form.latitude.trim(),
          longitude: form.longitude.trim(),
        }),
      });

      const json = (await res.json()) as StationLocationVerification & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo verificar la ubicación.");
      }

      setVerification(json);
      if (json.status === "warning") {
        setError("La dirección y el punto del servicio necesitan revisión.");
      } else {
        setMessage("Verificación completada.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar la ubicación.");
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearFeedback();

    const latitude = form.latitude.trim() ? Number(form.latitude) : null;
    const longitude = form.longitude.trim() ? Number(form.longitude) : null;

    const payload: ServiceAdminInput = {
      name: form.name.trim(),
      category: form.category,
      zone: form.zone.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      latitude,
      longitude,
      phone: form.phone.trim() || undefined,
      whatsapp_number: form.whatsapp_number.trim() || undefined,
      website_url: form.website_url.trim() || undefined,
      description: form.description.trim() || undefined,
      is_active: form.is_active,
      is_verified: form.is_verified,
      source_url: form.source_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/services" : `/api/admin/services/${serviceId}`,
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
        setVerification(null);
        router.replace(`/admin/services/new?created=1&name=${encodeURIComponent(payload.name)}`);
        router.refresh();
        return;
      }

      setMessage("Servicio actualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !serviceId) return;

    const confirmed = window.confirm(
      `¿Eliminar el servicio "${form.name.trim() || "sin nombre"}"?`
    );

    if (!confirmed) return;

    setDeleting(true);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "DELETE",
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar el servicio");

      router.push("/admin/services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "create" ? "Nuevo servicio" : "Editar servicio"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Carga talleres, grúas, mecánica móvil o venta de aditivos con contacto directo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input className={fieldClass()} value={form.name} onChange={(e) => updateForm({ name: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Categoría</span>
          <select className={fieldClass()} value={form.category} onChange={(e) => updateForm({ category: e.target.value as typeof form.category })}>
            {SUPPORT_SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Zona</span>
          <input className={fieldClass()} value={form.zone} onChange={(e) => updateForm({ zone: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Ciudad</span>
          <input className={fieldClass()} value={form.city} onChange={(e) => updateForm({ city: e.target.value })} />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Pega dirección, coordenadas o URL de Google Maps</span>
          <textarea className={fieldClass()} value={form.maps_input} onChange={(e) => updateForm({ maps_input: e.target.value })} rows={3} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={applyMapsInput} disabled={resolving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
            {resolving ? "Resolviendo enlace..." : "Analizar y completar"}
          </button>
          <span className="text-xs text-slate-500">
            Detectado: lat {parsedPreview.latitude ?? "-"} / lng {parsedPreview.longitude ?? "-"}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Dirección</span>
        <input className={fieldClass()} value={form.address} onChange={(e) => updateForm({ address: e.target.value })} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Latitud</span>
          <input className={fieldClass()} value={form.latitude} onChange={(e) => updateForm({ latitude: e.target.value })} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Longitud</span>
          <input className={fieldClass()} value={form.longitude} onChange={(e) => updateForm({ longitude: e.target.value })} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={verifyLocation} disabled={verifying} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {verifying ? "Verificando..." : "Verificar calle y punto"}
        </button>
        {verification ? (
          <span className="text-xs text-slate-500">
            Distancia dirección vs punto: {formatDistance(verification.distanceKm)}
          </span>
        ) : null}
      </div>

      {verification ? (
        <div className="grid gap-4 lg:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Dirección geocodificada</p>
            <p className="mt-2">{verification.addressCandidate?.displayName || "Sin coincidencia"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Calle del punto</p>
            <p className="mt-2">{verification.reverseCandidate?.displayName || "Sin calle estimada"}</p>
          </div>
        </div>
      ) : null}

      <StationLocationPicker
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={({ latitude, longitude }) => updateForm({ latitude, longitude })}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Teléfono</span>
          <input className={fieldClass()} value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="+591..." />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">WhatsApp</span>
          <input className={fieldClass()} value={form.whatsapp_number} onChange={(e) => updateForm({ whatsapp_number: e.target.value })} placeholder="+591..." />
        </label>
        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">Sitio web o enlace</span>
          <input className={fieldClass()} value={form.website_url} onChange={(e) => updateForm({ website_url: e.target.value })} placeholder="https://..." />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Descripción</span>
        <textarea className={fieldClass()} value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={3} />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">URL de origen</span>
        <input className={fieldClass()} value={form.source_url} onChange={(e) => updateForm({ source_url: e.target.value })} />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["is_active", "Activo"],
          ["is_verified", "Verificado"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={(form as Record<string, boolean | string>)[key] as boolean} onChange={(e) => updateForm({ [key]: e.target.checked } as Partial<typeof form>)} />
            {label}
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Notas</span>
        <textarea className={fieldClass()} value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} rows={4} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving || deleting} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? "Guardando..." : mode === "create" ? "Crear servicio" : "Guardar cambios"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="rounded-xl border border-rose-300 px-5 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar servicio"}
          </button>
        ) : null}
        {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </form>
  );
}

export default ServiceForm;
