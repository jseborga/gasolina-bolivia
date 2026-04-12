"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StationLocationPicker } from "@/components/admin/station-location-picker";
import type {
  AppProfileAdminRow,
  ParkingSiteAdminInput,
  ParkingSiteAdminRow,
} from "@/lib/admin-parking-types";
import {
  getAppProfileRoleLabel,
  getParkingStatusLabel,
  PARKING_STATUS_OPTIONS,
} from "@/lib/parking";

type ManagerOption = Pick<AppProfileAdminRow, "id" | "full_name" | "role" | "is_active">;

type Props = {
  initial?: Partial<ParkingSiteAdminRow>;
  managerOptions: ManagerOption[];
  mode: "create" | "edit";
  parkingSiteId?: number;
};

const CREATE_BASE_STATE = {
  accepts_reservations: false,
  access_notes: "",
  address: "",
  available_spots: "",
  city: "La Paz",
  closes_at: "22:00",
  code: "",
  height_limit_text: "",
  is_24h: false,
  is_active: true,
  is_published: true,
  is_verified: false,
  latitude: "",
  longitude: "",
  manager_profile_id: "",
  name: "",
  opens_at: "07:00",
  payment_methods: "",
  phone: "",
  pricing_text: "",
  source_url: "",
  status: "unknown" as const,
  total_spots: "",
  whatsapp_number: "",
  zone: "",
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

export function ParkingSiteForm({
  initial,
  managerOptions,
  mode,
  parkingSiteId,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    accepts_reservations: initial?.accepts_reservations ?? CREATE_BASE_STATE.accepts_reservations,
    access_notes: initial?.access_notes ?? CREATE_BASE_STATE.access_notes,
    address: initial?.address ?? CREATE_BASE_STATE.address,
    available_spots: initial?.available_spots?.toString() ?? CREATE_BASE_STATE.available_spots,
    city: initial?.city ?? CREATE_BASE_STATE.city,
    closes_at: initial?.closes_at ?? CREATE_BASE_STATE.closes_at,
    code: initial?.code ?? CREATE_BASE_STATE.code,
    height_limit_text: initial?.height_limit_text ?? CREATE_BASE_STATE.height_limit_text,
    is_24h: initial?.is_24h ?? CREATE_BASE_STATE.is_24h,
    is_active: initial?.is_active ?? CREATE_BASE_STATE.is_active,
    is_published: initial?.is_published ?? CREATE_BASE_STATE.is_published,
    is_verified: initial?.is_verified ?? CREATE_BASE_STATE.is_verified,
    latitude: initial?.latitude?.toString() ?? CREATE_BASE_STATE.latitude,
    longitude: initial?.longitude?.toString() ?? CREATE_BASE_STATE.longitude,
    manager_profile_id:
      initial?.manager_profile_id != null ? String(initial.manager_profile_id) : "",
    name: initial?.name ?? CREATE_BASE_STATE.name,
    opens_at: initial?.opens_at ?? CREATE_BASE_STATE.opens_at,
    payment_methods: initial?.payment_methods ?? CREATE_BASE_STATE.payment_methods,
    phone: initial?.phone ?? CREATE_BASE_STATE.phone,
    pricing_text: initial?.pricing_text ?? CREATE_BASE_STATE.pricing_text,
    source_url: initial?.source_url ?? CREATE_BASE_STATE.source_url,
    status: initial?.status ?? CREATE_BASE_STATE.status,
    total_spots: initial?.total_spots?.toString() ?? CREATE_BASE_STATE.total_spots,
    whatsapp_number: initial?.whatsapp_number ?? CREATE_BASE_STATE.whatsapp_number,
    zone: initial?.zone ?? CREATE_BASE_STATE.zone,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
    setMessage(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const latitudeValue = form.latitude.trim();
    const longitudeValue = form.longitude.trim();
    if ((latitudeValue && !longitudeValue) || (!latitudeValue && longitudeValue)) {
      setSaving(false);
      setError("Debes completar latitud y longitud juntas.");
      return;
    }

    const latitude = latitudeValue ? Number(latitudeValue) : null;
    const longitude = longitudeValue ? Number(longitudeValue) : null;
    const totalSpots = form.total_spots.trim() ? Number(form.total_spots) : null;
    const availableSpots = form.available_spots.trim() ? Number(form.available_spots) : null;
    const managerProfileId = form.manager_profile_id ? Number(form.manager_profile_id) : null;

    if (
      (latitudeValue && !Number.isFinite(latitude ?? Number.NaN)) ||
      (longitudeValue && !Number.isFinite(longitude ?? Number.NaN))
    ) {
      setSaving(false);
      setError("Las coordenadas deben ser numericas.");
      return;
    }

    if (
      (form.total_spots.trim() && !Number.isFinite(totalSpots ?? Number.NaN)) ||
      (form.available_spots.trim() && !Number.isFinite(availableSpots ?? Number.NaN))
    ) {
      setSaving(false);
      setError("La capacidad y los cupos deben ser numericos.");
      return;
    }

    if (
      totalSpots != null &&
      availableSpots != null &&
      Math.round(availableSpots) > Math.round(totalSpots)
    ) {
      setSaving(false);
      setError("Los cupos disponibles no pueden ser mayores a la capacidad total.");
      return;
    }

    if (form.manager_profile_id && !Number.isFinite(managerProfileId ?? Number.NaN)) {
      setSaving(false);
      setError("El encargado seleccionado no es valido.");
      return;
    }

    const payload: ParkingSiteAdminInput = {
      accepts_reservations: form.accepts_reservations,
      access_notes: form.access_notes.trim() || undefined,
      address: form.address.trim() || undefined,
      available_spots: availableSpots != null ? Math.round(availableSpots) : null,
      city: form.city.trim() || undefined,
      closes_at: form.closes_at.trim() || undefined,
      code: form.code.trim().toUpperCase(),
      height_limit_text: form.height_limit_text.trim() || undefined,
      is_24h: form.is_24h,
      is_active: form.is_active,
      is_published: form.is_published,
      is_verified: form.is_verified,
      latitude,
      longitude,
      manager_profile_id: managerProfileId,
      name: form.name.trim(),
      opens_at: form.opens_at.trim() || undefined,
      payment_methods: form.payment_methods.trim() || undefined,
      phone: form.phone.trim() || undefined,
      pricing_text: form.pricing_text.trim() || undefined,
      source_url: form.source_url.trim() || undefined,
      status: form.status,
      total_spots: totalSpots != null ? Math.round(totalSpots) : null,
      whatsapp_number: form.whatsapp_number.trim() || undefined,
      zone: form.zone.trim() || undefined,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/parking-sites" : `/api/admin/parking-sites/${parkingSiteId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = (await response.json()) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo guardar el parqueo.");
      }

      if (mode === "create") {
        setForm({ ...CREATE_BASE_STATE });
        router.replace(
          `/admin/parking-sites/new?created=1&name=${encodeURIComponent(payload.name)}`
        );
        router.refresh();
        return;
      }

      setMessage("Parqueo actualizado.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "No se pudo guardar el parqueo."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !parkingSiteId) return;

    const confirmed = window.confirm(
      `Eliminar el parqueo "${form.name.trim() || "sin nombre"}"?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/parking-sites/${parkingSiteId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo eliminar el parqueo.");
      }

      router.push("/admin/parking-sites");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el parqueo."
      );
      setDeleting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "create" ? "Nuevo parqueo" : "Editar parqueo"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Define cupos, horario, contacto, encargado y visibilidad publica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input
            className={fieldClass()}
            value={form.name}
            onChange={(event) => updateForm({ name: event.target.value })}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Codigo</span>
          <input
            className={fieldClass()}
            value={form.code}
            onChange={(event) => updateForm({ code: event.target.value.toUpperCase() })}
            placeholder="LPZ-CAL-01"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Encargado</span>
          <select
            className={fieldClass()}
            value={form.manager_profile_id}
            onChange={(event) => updateForm({ manager_profile_id: event.target.value })}
          >
            <option value="">Sin encargado</option>
            {managerOptions.map((profile) => (
              <option key={profile.id} value={String(profile.id)}>
                {profile.full_name} | {getAppProfileRoleLabel(profile.role)}
                {profile.is_active ? "" : " | Inactivo"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Ciudad</span>
          <input
            className={fieldClass()}
            value={form.city}
            onChange={(event) => updateForm({ city: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Zona</span>
          <input
            className={fieldClass()}
            value={form.zone}
            onChange={(event) => updateForm({ zone: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2 xl:col-span-1">
          <span className="font-medium text-slate-700">Direccion</span>
          <input
            className={fieldClass()}
            value={form.address}
            onChange={(event) => updateForm({ address: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Estado</span>
          <select
            className={fieldClass()}
            value={form.status}
            onChange={(event) =>
              updateForm({ status: event.target.value as typeof form.status })
            }
          >
            {PARKING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Capacidad total</span>
          <input
            type="number"
            min="0"
            className={fieldClass()}
            value={form.total_spots}
            onChange={(event) => updateForm({ total_spots: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Cupos disponibles</span>
          <input
            type="number"
            min="0"
            className={fieldClass()}
            value={form.available_spots}
            onChange={(event) => updateForm({ available_spots: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Precio</span>
          <input
            className={fieldClass()}
            value={form.pricing_text}
            onChange={(event) => updateForm({ pricing_text: event.target.value })}
            placeholder="Bs 10 por hora"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Apertura</span>
          <input
            className={fieldClass()}
            value={form.opens_at}
            onChange={(event) => updateForm({ opens_at: event.target.value })}
            placeholder="07:00"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Cierre</span>
          <input
            className={fieldClass()}
            value={form.closes_at}
            onChange={(event) => updateForm({ closes_at: event.target.value })}
            placeholder="22:00"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Telefono</span>
          <input
            className={fieldClass()}
            value={form.phone}
            onChange={(event) => updateForm({ phone: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">WhatsApp</span>
          <input
            className={fieldClass()}
            value={form.whatsapp_number}
            onChange={(event) => updateForm({ whatsapp_number: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Altura maxima</span>
          <input
            className={fieldClass()}
            value={form.height_limit_text}
            onChange={(event) => updateForm({ height_limit_text: event.target.value })}
            placeholder="2.10 m"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">Metodos de pago</span>
          <input
            className={fieldClass()}
            value={form.payment_methods}
            onChange={(event) => updateForm({ payment_methods: event.target.value })}
            placeholder="Efectivo, QR, tarjeta"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2 xl:col-span-3">
          <span className="font-medium text-slate-700">Notas de acceso</span>
          <textarea
            rows={3}
            className={fieldClass()}
            value={form.access_notes}
            onChange={(event) => updateForm({ access_notes: event.target.value })}
            placeholder="Ingreso por calle secundaria, porton azul, admite reservas..."
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2 xl:col-span-3">
          <span className="font-medium text-slate-700">URL de referencia</span>
          <input
            className={fieldClass()}
            value={form.source_url}
            onChange={(event) => updateForm({ source_url: event.target.value })}
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_24h}
            onChange={(event) => updateForm({ is_24h: event.target.checked })}
          />
          Abierto 24 horas
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.accepts_reservations}
            onChange={(event) => updateForm({ accepts_reservations: event.target.checked })}
          />
          Acepta reservas
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateForm({ is_active: event.target.checked })}
          />
          Activo
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(event) => updateForm({ is_published: event.target.checked })}
          />
          Publicado
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_verified}
            onChange={(event) => updateForm({ is_verified: event.target.checked })}
          />
          Verificado
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Latitud</span>
          <input
            className={fieldClass()}
            value={form.latitude}
            onChange={(event) => updateForm({ latitude: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Longitud</span>
          <input
            className={fieldClass()}
            value={form.longitude}
            onChange={(event) => updateForm({ longitude: event.target.value })}
          />
        </label>
      </div>

      <StationLocationPicker
        latitude={form.latitude}
        longitude={form.longitude}
        onChange={(coords) => updateForm(coords)}
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving
            ? mode === "create"
              ? "Creando..."
              : "Guardando..."
            : mode === "create"
              ? "Crear parqueo"
              : "Guardar cambios"}
        </button>

        {mode === "edit" ? (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-2xl border border-rose-300 px-5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar parqueo"}
          </button>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
          Estado publico actual:{" "}
          <strong className="text-slate-900">{getParkingStatusLabel(form.status)}</strong>
        </div>
      </div>
    </form>
  );
}

export default ParkingSiteForm;
