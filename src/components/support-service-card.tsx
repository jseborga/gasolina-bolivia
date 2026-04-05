"use client";

import { buildTelHref, buildWhatsAppHref, formatContactLabel } from "@/lib/contact";
import { getSupportServiceLabel } from "@/lib/services";
import type { SupportServiceWithDistance } from "@/lib/types";

type SupportServiceCardProps = {
  service: SupportServiceWithDistance;
};

const categoryStyles = {
  taller_mecanico: "bg-amber-100 text-amber-800",
  grua: "bg-rose-100 text-rose-800",
  servicio_mecanico: "bg-sky-100 text-sky-800",
  aditivos: "bg-emerald-100 text-emerald-800",
} as const;

function normalizeExternalUrl(url?: string | null) {
  const trimmed = url?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function SupportServiceCard({ service }: SupportServiceCardProps) {
  const phoneHref = buildTelHref(service.phone ?? service.whatsapp_number);
  const whatsappHref = buildWhatsAppHref(service.whatsapp_number ?? service.phone);
  const websiteHref = normalizeExternalUrl(service.website_url);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              categoryStyles[service.category]
            }`}
          >
            {getSupportServiceLabel(service.category)}
          </span>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">{service.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {[service.zone, service.city].filter(Boolean).join(" | ") || "Sin zona"}
          </p>
        </div>

        {service.distanceKm != null && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {service.distanceKm.toFixed(1)} km
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>{service.address || "Sin direccion registrada"}</p>
        {service.description && <p className="text-slate-600">{service.description}</p>}
        <p>Contacto: {formatContactLabel(service.phone ?? service.whatsapp_number)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            WhatsApp
          </a>
        )}

        {phoneHref && (
          <a
            href={phoneHref}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Llamar
          </a>
        )}

        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Abrir enlace
          </a>
        )}
      </div>
    </article>
  );
}
