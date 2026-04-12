"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatParkingAvailability,
  getAppProfileRoleLabel,
  getParkingStatusLabel,
  getParkingStatusPillClass,
  PARKING_STATUS_OPTIONS,
} from "@/lib/parking";
import type { AppProfile, ParkingSite } from "@/lib/types";

type Props = {
  appBaseUrl: string;
  profile: AppProfile;
  sites: ParkingSite[];
};

function fieldClass() {
  return "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500";
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function ParkingManagerPanel({ appBaseUrl, profile, sites }: Props) {
  const [managedSites, setManagedSites] = useState(sites);
  const [selectedSiteId, setSelectedSiteId] = useState(() =>
    sites[0] ? String(sites[0].id) : ""
  );
  const [status, setStatus] = useState(sites[0]?.status ?? "unknown");
  const [availableSpots, setAvailableSpots] = useState(
    sites[0]?.available_spots != null ? String(sites[0].available_spots) : ""
  );
  const [pricingText, setPricingText] = useState(sites[0]?.pricing_text ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSite = useMemo(
    () => managedSites.find((site) => String(site.id) === selectedSiteId) ?? null,
    [managedSites, selectedSiteId]
  );

  useEffect(() => {
    if (!selectedSite) return;

    setStatus(selectedSite.status);
    setAvailableSpots(
      selectedSite.available_spots != null ? String(selectedSite.available_spots) : ""
    );
    setPricingText(selectedSite.pricing_text ?? "");
    setNote("");
  }, [selectedSite]);

  const commandExamples = useMemo(() => {
    const exampleCode = managedSites[0]?.code ?? "LPZ-CAL-01";
    if (managedSites.length <= 1) {
      return ["ABIERTO 25", "LLENO", "CERRADO", "ABIERTO 12 turno noche"];
    }

    return [
      `${exampleCode} ABIERTO 25`,
      `${exampleCode} LLENO`,
      `${exampleCode} CERRADO`,
      `${exampleCode} ABIERTO 12 turno noche`,
    ];
  }, [managedSites]);

  const portalUrl = `${appBaseUrl.replace(/\/$/, "")}/parqueos/gestion/${profile.manager_access_token}`;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSite) {
      setError("No hay parqueo seleccionado.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const availableSpotsValue = availableSpots.trim()
      ? Number(availableSpots.trim())
      : undefined;
    if (
      availableSpots.trim().length > 0 &&
      !Number.isFinite(availableSpotsValue ?? Number.NaN)
    ) {
      setSaving(false);
      setError("Los cupos disponibles deben ser numericos.");
      return;
    }

    try {
      const response = await fetch("/api/parking-manager/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: profile.manager_access_token,
          availableSpots: availableSpotsValue,
          note: note.trim() || undefined,
          parkingSiteId: selectedSite.id,
          pricingText: pricingText.trim() || undefined,
          status,
        }),
      });

      const json = (await response.json()) as { error?: string; site?: ParkingSite };
      if (!response.ok || !json.site) {
        throw new Error(json.error || "No se pudo actualizar el parqueo.");
      }

      setManagedSites((current) =>
        current.map((site) => (site.id === json.site!.id ? json.site! : site))
      );
      setMessage(`Actualizacion guardada para ${json.site.name}.`);
      setNote("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo actualizar el parqueo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Portal de gestion de parqueos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Perfil: <strong>{profile.full_name}</strong> | {getAppProfileRoleLabel(profile.role)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Este enlace privado permite reportar cupos, estado y notas operativas.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-medium">Enlace actual</p>
            <p className="mt-2 break-all font-mono text-xs">{portalUrl}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {managedSites.map((site) => {
          const isSelected = String(site.id) === selectedSiteId;

          return (
            <button
              key={site.id}
              type="button"
              onClick={() => setSelectedSiteId(String(site.id))}
              className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-80">{site.code}</p>
                  <p className="mt-1 text-lg font-semibold">{site.name}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isSelected
                      ? "bg-white/15 text-white"
                      : getParkingStatusPillClass(site.status)
                  }`}
                >
                  {getParkingStatusLabel(site.status)}
                </span>
              </div>

              <p className={`mt-3 text-sm ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                {formatParkingAvailability(site.available_spots, site.total_spots)}
              </p>
              <p className={`mt-1 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                Ultima actualizacion: {formatDate(site.last_updated_at)}
              </p>
            </button>
          );
        })}
      </section>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Actualizar disponibilidad</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cambia el estado actual y los cupos para que el mapa muestre informacion fresca.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm md:col-span-2 xl:col-span-1">
            <span className="font-medium text-slate-700">Parqueo</span>
            <select
              className={fieldClass()}
              value={selectedSiteId}
              onChange={(event) => setSelectedSiteId(event.target.value)}
            >
              {managedSites.map((site) => (
                <option key={site.id} value={String(site.id)}>
                  {site.code} | {site.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select
              className={fieldClass()}
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {PARKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Cupos disponibles</span>
            <input
              type="number"
              min="0"
              className={fieldClass()}
              value={availableSpots}
              onChange={(event) => setAvailableSpots(event.target.value)}
              placeholder="12"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">Precio actual</span>
            <input
              className={fieldClass()}
              value={pricingText}
              onChange={(event) => setPricingText(event.target.value)}
              placeholder="Bs 10 por hora"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">Nota operativa</span>
          <textarea
            rows={3}
            className={fieldClass()}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Porton lateral libre, solo autos livianos, ingreso por cola sur..."
          />
        </label>

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
            {saving ? "Guardando..." : "Guardar actualizacion"}
          </button>

          {selectedSite ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              Actual:{" "}
              <strong className="text-slate-900">
                {formatParkingAvailability(selectedSite.available_spots, selectedSite.total_spots)}
              </strong>
            </div>
          ) : null}
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Comandos para WhatsApp + Evolution</h2>
        <p className="mt-2 text-sm text-slate-600">
          Si conectas Evolution API al webhook, el sistema acepta mensajes simples desde el
          numero registrado en este perfil.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {commandExamples.map((command) => (
            <div
              key={command}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800"
            >
              {command}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Si tienes varios parqueos, el primer token debe ser el codigo del parqueo.
        </p>
      </section>
    </div>
  );
}

export default ParkingManagerPanel;
