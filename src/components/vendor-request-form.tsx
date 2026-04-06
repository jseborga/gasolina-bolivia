"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackAppEvent } from "@/lib/analytics";
import type { VendorRequestCategory, VendorRequestInput } from "@/lib/types";

const categoryOptions: Array<{ label: string; value: VendorRequestCategory }> = [
  { label: "Taller mecanico", value: "taller_mecanico" },
  { label: "Grua", value: "grua" },
  { label: "Auxilio mecanico", value: "servicio_mecanico" },
  { label: "Aditivos", value: "aditivos" },
  { label: "Estacion de servicio", value: "estacion" },
];

export function VendorRequestForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    category: "taller_mecanico" as VendorRequestCategory,
    city: "La Paz",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (patch: Partial<typeof form>) =>
    setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    trackAppEvent({
      eventType: "view_vendor_join",
      targetType: "vendor_request",
    });
  }, []);

  useEffect(() => {
    const requestedCategory = searchParams.get("category");
    const isValidCategory = categoryOptions.some(
      (option) => option.value === requestedCategory
    );

    if (!isValidCategory || !requestedCategory) {
      return;
    }

    setForm((current) =>
      current.category === requestedCategory
        ? current
        : { ...current, category: requestedCategory as VendorRequestCategory }
    );
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload: VendorRequestInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      business_name: form.business_name.trim() || undefined,
      category: form.category,
      city: form.city.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/vendor-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar la solicitud.");
      }

      trackAppEvent({
        eventType: "vendor_request_created",
        targetName: payload.business_name ?? payload.name,
        targetType: "vendor_request",
        metadata: {
          category: payload.category,
          city: payload.city ?? null,
        },
      });

      setForm({
        name: "",
        email: "",
        phone: "",
        business_name: "",
        category: "taller_mecanico",
        city: "La Paz",
        notes: "",
      });
      setMessage(
        "Solicitud recibida. El siguiente paso recomendado es habilitar verificacion por correo y un portal de proveedor."
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar la solicitud."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Quiero publicar mi servicio o producto
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Deja tus datos y te habilitamos el flujo comercial. Por ahora queda como
          solicitud administrada desde el panel interno.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.name}
            onChange={(event) => updateForm({ name: event.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Correo</span>
          <input
            type="email"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.email}
            onChange={(event) => updateForm({ email: event.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Telefono o WhatsApp</span>
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.phone}
            onChange={(event) => updateForm({ phone: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Negocio o marca</span>
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.business_name}
            onChange={(event) => updateForm({ business_name: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Quiero ofrecer</span>
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.category}
            onChange={(event) =>
              updateForm({ category: event.target.value as VendorRequestCategory })
            }
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Ciudad</span>
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            value={form.city}
            onChange={(event) => updateForm({ city: event.target.value })}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">Detalle</span>
        <textarea
          rows={4}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          value={form.notes}
          onChange={(event) => updateForm({ notes: event.target.value })}
          placeholder="Zona, producto, horario, forma de trabajo, etc."
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? "Enviando..." : "Enviar solicitud"}
      </button>

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
    </form>
  );
}

export default VendorRequestForm;
