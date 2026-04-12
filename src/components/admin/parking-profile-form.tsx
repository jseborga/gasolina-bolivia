"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppProfileAdminInput, AppProfileAdminRow } from "@/lib/admin-parking-types";
import { APP_PROFILE_ROLE_OPTIONS, getAppProfileRoleLabel } from "@/lib/parking";

type AssignedParking = {
  code: string;
  id: number;
  name: string;
};

type Props = {
  assignedParkings?: AssignedParking[];
  initial?: Partial<AppProfileAdminRow>;
  mode: "create" | "edit";
  portalBaseUrl: string;
  profileId?: number;
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

export function ParkingProfileForm({
  assignedParkings = [],
  initial,
  mode,
  portalBaseUrl,
  profileId,
}: Props) {
  const router = useRouter();
  const [currentToken, setCurrentToken] = useState(initial?.manager_access_token ?? "");
  const [form, setForm] = useState({
    credit_balance: initial?.credit_balance?.toString() ?? "0",
    email: initial?.email ?? "",
    full_name: initial?.full_name ?? "",
    is_active: initial?.is_active ?? true,
    notes: initial?.notes ?? "",
    phone: initial?.phone ?? "",
    regenerate_access_token: false,
    reliability_score: initial?.reliability_score?.toString() ?? "0",
    role: initial?.role ?? "parking_manager",
    telegram_chat_id: initial?.telegram_chat_id ?? "",
    whatsapp_number: initial?.whatsapp_number ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const portalUrl = currentToken
    ? `${portalBaseUrl.replace(/\/$/, "")}/parqueos/gestion/${currentToken}`
    : null;

  const updateForm = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }));
    setMessage(null);
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const reliabilityScore = form.reliability_score.trim()
      ? Number(form.reliability_score)
      : null;
    const creditBalance = form.credit_balance.trim() ? Number(form.credit_balance) : null;

    if (
      form.reliability_score.trim().length > 0 &&
      !Number.isFinite(reliabilityScore ?? Number.NaN)
    ) {
      setSaving(false);
      setError("La confiabilidad debe ser numerica.");
      return;
    }

    if (
      form.credit_balance.trim().length > 0 &&
      !Number.isFinite(creditBalance ?? Number.NaN)
    ) {
      setSaving(false);
      setError("Los creditos deben ser numericos.");
      return;
    }

    const payload: AppProfileAdminInput = {
      credit_balance: creditBalance != null ? Math.round(creditBalance) : null,
      email: form.email.trim() || undefined,
      full_name: form.full_name.trim(),
      is_active: form.is_active,
      notes: form.notes.trim() || undefined,
      phone: form.phone.trim() || undefined,
      regenerate_access_token: form.regenerate_access_token,
      reliability_score: reliabilityScore,
      role: form.role,
      telegram_chat_id: form.telegram_chat_id.trim() || undefined,
      whatsapp_number: form.whatsapp_number.trim() || undefined,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/profiles" : `/api/admin/profiles/${profileId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = (await response.json()) as {
        error?: string;
        profile?: AppProfileAdminRow;
      };

      if (!response.ok || !json.profile) {
        throw new Error(json.error || "No se pudo guardar el perfil.");
      }

      setCurrentToken(json.profile.manager_access_token);

      if (mode === "create") {
        router.push(`/admin/profiles/${json.profile.id}?created=1`);
        router.refresh();
        return;
      }

      updateForm({ regenerate_access_token: false });
      setMessage("Perfil actualizado.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "No se pudo guardar el perfil."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !profileId) return;

    const confirmed = window.confirm(
      `Eliminar el perfil "${form.full_name.trim() || "sin nombre"}"?`
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/profiles/${profileId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "No se pudo eliminar el perfil.");
      }

      router.push("/admin/profiles");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el perfil."
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
          {mode === "create" ? "Nuevo perfil" : "Editar perfil"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Roles para encargados de parqueo, reporteros confiables y apoyo operativo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre completo</span>
          <input
            className={fieldClass()}
            value={form.full_name}
            onChange={(event) => updateForm({ full_name: event.target.value })}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Rol</span>
          <select
            className={fieldClass()}
            value={form.role}
            onChange={(event) => updateForm({ role: event.target.value as typeof form.role })}
          >
            {APP_PROFILE_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Correo</span>
          <input
            type="email"
            className={fieldClass()}
            value={form.email}
            onChange={(event) => updateForm({ email: event.target.value })}
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
          <span className="font-medium text-slate-700">Telegram chat id</span>
          <input
            className={fieldClass()}
            value={form.telegram_chat_id}
            onChange={(event) => updateForm({ telegram_chat_id: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Confiabilidad</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className={fieldClass()}
            value={form.reliability_score}
            onChange={(event) => updateForm({ reliability_score: event.target.value })}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Creditos</span>
          <input
            type="number"
            min="0"
            className={fieldClass()}
            value={form.credit_balance}
            onChange={(event) => updateForm({ credit_balance: event.target.value })}
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateForm({ is_active: event.target.checked })}
          />
          Perfil activo
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Notas internas</span>
        <textarea
          rows={4}
          className={fieldClass()}
          value={form.notes}
          onChange={(event) => updateForm({ notes: event.target.value })}
          placeholder="Nivel de confianza, reglas de pago, observaciones del equipo..."
        />
      </label>

      {mode === "edit" ? (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.regenerate_access_token}
            onChange={(event) =>
              updateForm({ regenerate_access_token: event.target.checked })
            }
          />
          Regenerar enlace privado de gestion
        </label>
      ) : null}

      {currentToken ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-medium">Enlace del gestor</p>
          <p className="mt-2 break-all font-mono text-xs">{portalUrl}</p>
          <p className="mt-2 break-all font-mono text-xs text-sky-800">
            Token operativo: {currentToken}
          </p>
          {portalUrl ? (
            <Link
              href={portalUrl}
              target="_blank"
              className="mt-3 inline-flex rounded-xl border border-sky-300 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-white"
            >
              Abrir portal del gestor
            </Link>
          ) : null}
          <p className="mt-3 text-xs text-sky-800">
            Rol actual: {getAppProfileRoleLabel(form.role)}. El webhook de Evolution reconoce
            el remitente por WhatsApp o telefono del perfil. El mismo token tambien sirve para
            activar el modo registrador en la app publica.
          </p>
        </div>
      ) : null}

      {assignedParkings.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Parqueos asignados</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {assignedParkings.map((parking) => (
              <Link
                key={parking.id}
                href={`/admin/parking-sites/${parking.id}`}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                {parking.code} | {parking.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

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
              ? "Crear perfil"
              : "Guardar cambios"}
        </button>

        {mode === "edit" ? (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-2xl border border-rose-300 px-5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar perfil"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default ParkingProfileForm;
