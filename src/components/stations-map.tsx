"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackAppEvent } from "@/lib/analytics";
import { RatingStars } from "@/components/rating-stars";
import { buildTelHref, buildWhatsAppHref, formatContactLabel } from "@/lib/contact";
import { formatAvailability, formatFuelType, formatQueue } from "@/lib/reporting";
import { getSupportServiceLabel } from "@/lib/services";
import type {
  ReportInput,
  StationWithLatest,
  SupportServiceCategory,
  SupportServiceWithDistance,
} from "@/lib/types";

type StationsMapProps = {
  adminActionKey?: string | null;
  isAdminMode?: boolean;
  onAdminDeleteService?: (serviceId: number) => void;
  onAdminDeleteStation?: (stationId: number) => void;
  onAdminOpenEditor?: (key: string) => void;
  onAdminToggleServicePublication?: (serviceId: number) => void;
  onAdminToggleServiceVerification?: (serviceId: number) => void;
  onAdminToggleStationVerification?: (stationId: number) => void;
  onQuickReportStation?: (
    input: ReportInput
  ) => Promise<{ ok: boolean; message: string }>;
  onSubmitStationReview?: (input: {
    comment?: string;
    score: number;
    stationId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  onSubmitServiceReview?: (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  services: SupportServiceWithDistance[];
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onRequestReportStation: (stationId: number, source: "detail" | "popup") => void;
  userLocation: { lat: number; lng: number } | null;
};

type PopupTab = "info" | "report" | "review";

function PopupTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function ChoiceChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1.5 text-[11px] font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function StationQuickReportPopup({
  onSubmit,
  station,
}: {
  onSubmit?: (input: ReportInput) => Promise<{ ok: boolean; message: string }>;
  station: StationWithLatest;
}) {
  const [fuelType, setFuelType] = useState<ReportInput["fuel_type"]>(
    station.latestReport?.fuel_type ?? "especial"
  );
  const [availabilityStatus, setAvailabilityStatus] =
    useState<ReportInput["availability_status"]>(
      station.latestReport?.availability_status ?? "si_hay"
    );
  const [queueStatus, setQueueStatus] = useState<ReportInput["queue_status"]>(
    station.latestReport?.queue_status ?? "sin_dato"
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!onSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        availability_status: availabilityStatus,
        fuel_type: fuelType,
        queue_status: queueStatus,
        station_id: station.id,
      });
      setFeedback(result);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Reporte rapido
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Combustible
          </div>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              active={fuelType === "especial"}
              label="Especial"
              onClick={() => setFuelType("especial")}
            />
            <ChoiceChip
              active={fuelType === "premium"}
              label="Premium"
              onClick={() => setFuelType("premium")}
            />
            <ChoiceChip
              active={fuelType === "diesel"}
              label="Diesel"
              onClick={() => setFuelType("diesel")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Estado
          </div>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              active={availabilityStatus === "si_hay"}
              label="Si hay"
              onClick={() => setAvailabilityStatus("si_hay")}
            />
            <ChoiceChip
              active={availabilityStatus === "no_hay"}
              label="No hay"
              onClick={() => setAvailabilityStatus("no_hay")}
            />
            <ChoiceChip
              active={availabilityStatus === "sin_dato"}
              label="Sin dato"
              onClick={() => setAvailabilityStatus("sin_dato")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Fila
          </div>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              active={queueStatus === "sin_dato"}
              label="Sin fila"
              onClick={() => setQueueStatus("sin_dato")}
            />
            <ChoiceChip
              active={queueStatus === "corta"}
              label="Corta"
              onClick={() => setQueueStatus("corta")}
            />
            <ChoiceChip
              active={queueStatus === "media"}
              label="Media"
              onClick={() => setQueueStatus("media")}
            />
            <ChoiceChip
              active={queueStatus === "larga"}
              label="Larga"
              onClick={() => setQueueStatus("larga")}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar estado"}
        </button>
      </div>
      {feedback ? (
        <div
          className={`rounded-lg px-2 py-1.5 text-[11px] ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

function StationReviewPopup({
  onSubmit,
  stationId,
}: {
  onSubmit?: (input: {
    comment?: string;
    score: number;
    stationId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  stationId: number;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!onSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        comment: comment.trim() || undefined,
        score,
        stationId,
      });
      setFeedback(result);
      if (result.ok) {
        setComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Calificacion anonima
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setScore(value)}
              className={`rounded-lg px-2 py-1 text-lg leading-none ${
                value <= score ? "bg-amber-100 text-amber-600" : "bg-white text-slate-300"
              }`}
              aria-label={`${value} estrellas`}
            >
              {"\u2605"}
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 180))}
        placeholder="Comentario corto opcional"
        rows={2}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-800"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar calificacion"}
      </button>
      {feedback ? (
        <div
          className={`rounded-lg px-2 py-1.5 text-[11px] ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

function ServiceReviewPopup({
  onSubmit,
  serviceId,
}: {
  onSubmit?: (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  serviceId: number;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async () => {
    if (!onSubmit) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await onSubmit({
        comment: comment.trim() || undefined,
        score,
        serviceId,
      });
      setFeedback(result);
      if (result.ok) {
        setComment("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Calificacion anonima
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setScore(value)}
              className={`rounded-lg px-2 py-1 text-lg leading-none ${
                value <= score ? "bg-amber-100 text-amber-600" : "bg-white text-slate-300"
              }`}
              aria-label={`${value} estrellas`}
            >
              ★
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 180))}
        placeholder="Comentario corto opcional"
        rows={2}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-800"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar calificacion"}
      </button>
      {feedback ? (
        <div
          className={`rounded-lg px-2 py-1.5 text-[11px] ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

function StationPopupCard({
  isAdminMode,
  isBusy,
  onAdminDeleteStation,
  onAdminOpenEditor,
  onAdminToggleStationVerification,
  onQuickReportStation,
  onSubmitStationReview,
  onRequestReportStation,
  station,
}: {
  isAdminMode: boolean;
  isBusy: boolean;
  onAdminDeleteStation?: (stationId: number) => void;
  onAdminOpenEditor?: (key: string) => void;
  onAdminToggleStationVerification?: (stationId: number) => void;
  onQuickReportStation?: (
    input: ReportInput
  ) => Promise<{ ok: boolean; message: string }>;
  onSubmitStationReview?: (input: {
    comment?: string;
    score: number;
    stationId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  onRequestReportStation: (stationId: number, source: "detail" | "popup") => void;
  station: StationWithLatest;
}) {
  const [tab, setTab] = useState<PopupTab>("info");
  const key = `station-${station.id}`;

  return (
    <div className="w-[72vw] min-w-[210px] max-w-[250px] space-y-2 text-xs text-slate-800 sm:w-[250px]">
      <div className="text-sm font-semibold leading-tight">{station.name}</div>
      <div className="flex flex-wrap gap-2">
        <PopupTabButton active={tab === "info"} onClick={() => setTab("info")}>
          Info
        </PopupTabButton>
        <PopupTabButton active={tab === "report"} onClick={() => setTab("report")}>
          Estado
        </PopupTabButton>
        <PopupTabButton active={tab === "review"} onClick={() => setTab("review")}>
          Calificar
        </PopupTabButton>
      </div>

      {tab === "info" ? (
        <div className="space-y-2">
          <div>{station.zone || "Sin zona"}</div>
          <RatingStars score={station.reputation_score} count={station.reputation_votes} />
          {isAdminMode && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span
                className={`rounded-full px-2 py-1 ${
                  station.is_verified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {station.is_verified ? "Validada" : "Pendiente"}
              </span>
              <span
                className={`rounded-full px-2 py-1 ${
                  station.is_active ? "bg-slate-100 text-slate-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {station.is_active ? "Activa" : "Inactiva"}
              </span>
            </div>
          )}
          <div>Estado: {formatAvailability(station.latestReport?.availability_status)}</div>
          <div>Combustible: {formatFuelType(station.latestReport?.fuel_type)}</div>
          <div>Fila: {formatQueue(station.latestReport?.queue_status)}</div>
          <div>{station.address || "Sin direccion"}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("report")}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
            >
              Enviar estado
            </button>
            <button
              type="button"
              onClick={() => setTab("review")}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
            >
              Calificar
            </button>
            {isAdminMode ? (
              <>
                <button
                  type="button"
                  onClick={() => onAdminOpenEditor?.(key)}
                  disabled={isBusy}
                    className="rounded-lg border border-sky-300 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onAdminToggleStationVerification?.(station.id)}
                  disabled={isBusy}
                    className="rounded-lg border border-emerald-300 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 disabled:opacity-60"
                >
                  {station.is_verified ? "Quitar valid." : "Validar"}
                </button>
                <button
                  type="button"
                  onClick={() => onAdminDeleteStation?.(station.id)}
                  disabled={isBusy}
                    className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRequestReportStation(station.id, "popup")}
            className="text-[11px] font-medium text-sky-700 underline underline-offset-2"
          >
            Abrir formulario completo
          </button>
        </div>
      ) : tab === "report" ? (
        <StationQuickReportPopup onSubmit={onQuickReportStation} station={station} />
      ) : (
        <StationReviewPopup onSubmit={onSubmitStationReview} stationId={station.id} />
      )}
    </div>
  );
}

function ServicePopupCard({
  isAdminMode,
  isBusy,
  onAdminDeleteService,
  onAdminOpenEditor,
  onAdminToggleServicePublication,
  onAdminToggleServiceVerification,
  onSubmitServiceReview,
  phoneHref,
  service,
  whatsappHref,
}: {
  isAdminMode: boolean;
  isBusy: boolean;
  onAdminDeleteService?: (serviceId: number) => void;
  onAdminOpenEditor?: (key: string) => void;
  onAdminToggleServicePublication?: (serviceId: number) => void;
  onAdminToggleServiceVerification?: (serviceId: number) => void;
  onSubmitServiceReview?: (input: {
    comment?: string;
    score: number;
    serviceId: number;
  }) => Promise<{ ok: boolean; message: string }>;
  phoneHref: string;
  service: SupportServiceWithDistance;
  whatsappHref: string;
}) {
  const [tab, setTab] = useState<PopupTab>("info");
  const key = `service-${service.id}`;

  return (
    <div className="w-[72vw] min-w-[210px] max-w-[250px] space-y-2 text-xs text-slate-800 sm:w-[250px]">
      <div className="text-sm font-semibold leading-tight">{service.name}</div>
      <div className="flex flex-wrap gap-2">
        <PopupTabButton active={tab === "info"} onClick={() => setTab("info")}>
          Info
        </PopupTabButton>
        <PopupTabButton active={tab === "review"} onClick={() => setTab("review")}>
          Calificar
        </PopupTabButton>
      </div>

      {tab === "info" ? (
        <div className="space-y-2">
          <div>{getSupportServiceLabel(service.category)}</div>
          <RatingStars score={service.rating_score} count={service.rating_count} />
          <div>{[service.zone, service.city].filter(Boolean).join(" | ") || "Sin zona"}</div>
          <div>{service.address || "Sin direccion"}</div>
          {service.price_text && <div>Precio: {service.price_text}</div>}
          {service.meeting_point && <div>Punto: {service.meeting_point}</div>}
          {service.description && <div>{service.description}</div>}
          {(service.phone || service.whatsapp_number) && (
            <div>Contacto: {formatContactLabel(service.phone ?? service.whatsapp_number)}</div>
          )}
          {isAdminMode && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span
                className={`rounded-full px-2 py-1 ${
                  service.is_verified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {service.is_verified ? "Validado" : "Pendiente"}
              </span>
              <span
                className={`rounded-full px-2 py-1 ${
                  service.is_published
                    ? "bg-sky-100 text-sky-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {service.is_published ? "Publicado" : "Borrador"}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {whatsappHref && (
              <a
                href={whatsappHref}
                onClick={() =>
                  trackAppEvent({
                    eventType: "contact_whatsapp",
                    targetId: service.id,
                    targetName: service.name,
                    targetType: "service",
                    metadata: {
                      category: service.category,
                      source: "popup",
                    },
                  })
                }
                target="_blank"
                rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white"
              >
                WhatsApp
              </a>
            )}
            {phoneHref && (
              <a
                href={phoneHref}
                onClick={() =>
                  trackAppEvent({
                    eventType: "contact_phone",
                    targetId: service.id,
                    targetName: service.name,
                    targetType: "service",
                    metadata: {
                      category: service.category,
                      source: "popup",
                    },
                  })
                }
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
              >
                Llamar
              </a>
            )}
            <button
              type="button"
              onClick={() => setTab("review")}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
            >
              Calificar
            </button>
            {isAdminMode ? (
              <>
                <button
                  type="button"
                  onClick={() => onAdminOpenEditor?.(key)}
                  disabled={isBusy}
                    className="rounded-lg border border-sky-300 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onAdminToggleServiceVerification?.(service.id)}
                  disabled={isBusy}
                    className="rounded-lg border border-emerald-300 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 disabled:opacity-60"
                >
                  {service.is_verified ? "Quitar valid." : "Validar"}
                </button>
                <button
                  type="button"
                  onClick={() => onAdminToggleServicePublication?.(service.id)}
                  disabled={isBusy}
                    className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 disabled:opacity-60"
                >
                  {service.is_published ? "Borrador" : "Publicar"}
                </button>
                <button
                  type="button"
                  onClick={() => onAdminDeleteService?.(service.id)}
                  disabled={isBusy}
                    className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <ServiceReviewPopup onSubmit={onSubmitServiceReview} serviceId={service.id} />
      )}
    </div>
  );
}

function getStationMarkerColor(status?: string | null) {
  switch (status) {
    case "si_hay":
      return "#16a34a";
    case "no_hay":
      return "#dc2626";
    case "sin_dato":
    default:
      return "#f59e0b";
  }
}

function getServiceMarkerMeta(category: SupportServiceCategory) {
  switch (category) {
    case "taller_mecanico":
      return { color: "#b45309", label: "T" };
    case "grua":
      return { color: "#e11d48", label: "G" };
    case "servicio_mecanico":
      return { color: "#0369a1", label: "A" };
    case "aditivos":
    default:
      return { color: "#15803d", label: "$" };
  }
}

function createStationMarkerIcon(color: string, isSelected: boolean, isActive: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 22 : 18}px;
        height:${isSelected ? 22 : 18}px;
        border-radius:9999px;
        background:${isActive ? color : "#94a3b8"};
        border:3px solid white;
        box-shadow:0 0 0 ${isSelected ? 2 : 1}px rgba(15,23,42,0.18);
        opacity:${isActive ? 1 : 0.68};
      "></div>
    `,
    iconSize: [isSelected ? 22 : 18, isSelected ? 22 : 18],
    iconAnchor: [isSelected ? 11 : 9, isSelected ? 11 : 9],
  });
}

function createServiceMarkerIcon(
  category: SupportServiceCategory,
  isSelected: boolean,
  isVisible: boolean
) {
  const { color, label } = getServiceMarkerMeta(category);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 28 : 24}px;
        height:${isSelected ? 28 : 24}px;
        border-radius:8px;
        background:${color};
        border:2px solid white;
        box-shadow:0 0 0 ${isSelected ? 2 : 1}px rgba(15,23,42,0.24);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:${isSelected ? 13 : 12}px;
        font-weight:700;
        opacity:${isVisible ? 1 : 0.68};
      ">${label}</div>
    `,
    iconSize: [isSelected ? 28 : 24, isSelected ? 28 : 24],
    iconAnchor: [isSelected ? 14 : 12, isSelected ? 14 : 12],
  });
}

function MapFocusController({
  selectedKey,
  stations,
  services,
}: {
  selectedKey: string | null;
  stations: (StationWithLatest & { distanceKm?: number | null })[];
  services: SupportServiceWithDistance[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedKey) return;

    const station = selectedKey.startsWith("station-")
      ? stations.find((item) => `station-${item.id}` === selectedKey)
      : null;
    const service = selectedKey.startsWith("service-")
      ? services.find((item) => `service-${item.id}` === selectedKey)
      : null;

    const latitude = station?.latitude ?? service?.latitude;
    const longitude = station?.longitude ?? service?.longitude;

    if (typeof latitude === "number" && typeof longitude === "number") {
      const zoom = Math.max(map.getZoom(), 15);
      const size = map.getSize();
      const isMobile = size.x < 640;
      const targetLatLng = L.latLng(latitude, longitude);
      const currentPoint = map.latLngToContainerPoint(targetLatLng);
      const horizontalPadding = 20;
      const topPadding = isMobile ? 180 : 120;
      const bottomPadding = isMobile ? 36 : 28;
      const alreadyVisible =
        currentPoint.x >= horizontalPadding &&
        currentPoint.x <= size.x - horizontalPadding &&
        currentPoint.y >= topPadding &&
        currentPoint.y <= size.y - bottomPadding;

      if (alreadyVisible) {
        return;
      }

      const desiredPoint = L.point(size.x / 2, isMobile ? size.y * 0.72 : size.y * 0.62);
      const markerPoint = map.project(targetLatLng, zoom);
      const offset = desiredPoint.subtract(size.divideBy(2));
      const nextCenterPoint = markerPoint.subtract(offset);
      const nextCenter = map.unproject(nextCenterPoint, zoom);

      map.flyTo(nextCenter, zoom, {
        animate: true,
        duration: 0.55,
      });
    }
  }, [map, selectedKey, services, stations]);

  return null;
}

export default function StationsMap({
  adminActionKey = null,
  isAdminMode = false,
  onAdminDeleteService,
  onAdminDeleteStation,
  onAdminOpenEditor,
  onAdminToggleServicePublication,
  onAdminToggleServiceVerification,
  onAdminToggleStationVerification,
  onQuickReportStation,
  onSubmitStationReview,
  onSubmitServiceReview,
  services,
  stations,
  selectedKey,
  onSelectKey,
  onRequestReportStation,
  userLocation,
}: StationsMapProps) {
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [-16.5, -68.15];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFocusController selectedKey={selectedKey} stations={stations} services={services} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9 }}
        >
          <Popup>Tu ubicacion</Popup>
        </CircleMarker>
      )}

      {services
        .filter(
          (service) =>
            typeof service.latitude === "number" && typeof service.longitude === "number"
        )
        .map((service) => {
          const key = `service-${service.id}`;
          const phoneHref = buildTelHref(service.phone ?? service.whatsapp_number);
          const whatsappHref = buildWhatsAppHref(service.whatsapp_number ?? service.phone);
          const isSelected = selectedKey === key;
          const isBusy = adminActionKey === key;
          const isVisible = service.is_active && (service.is_published ?? true);

          return (
            <Marker
              key={key}
              position={[service.latitude as number, service.longitude as number]}
              icon={createServiceMarkerIcon(service.category, isSelected, isVisible)}
              eventHandlers={{
                click: () => onSelectKey(key),
              }}
            >
              <Popup keepInView maxWidth={280}>
                <ServicePopupCard
                  isAdminMode={isAdminMode}
                  isBusy={isBusy}
                  onAdminDeleteService={onAdminDeleteService}
                  onAdminOpenEditor={onAdminOpenEditor}
                  onAdminToggleServicePublication={onAdminToggleServicePublication}
                  onAdminToggleServiceVerification={onAdminToggleServiceVerification}
                  onSubmitServiceReview={onSubmitServiceReview}
                  phoneHref={phoneHref}
                  service={service}
                  whatsappHref={whatsappHref}
                />
              </Popup>
            </Marker>
          );
        })}

      {stations
        .filter(
          (station) =>
            typeof station.latitude === "number" && typeof station.longitude === "number"
        )
        .map((station) => {
          const key = `station-${station.id}`;
          const isSelected = selectedKey === key;
          const color = getStationMarkerColor(station.latestReport?.availability_status);
          const isBusy = adminActionKey === key;

          return (
            <Marker
              key={key}
              position={[station.latitude as number, station.longitude as number]}
              icon={createStationMarkerIcon(color, isSelected, station.is_active ?? true)}
              eventHandlers={{
                click: () => onSelectKey(key),
              }}
            >
              <Popup keepInView maxWidth={280}>
                <StationPopupCard
                  isAdminMode={isAdminMode}
                  isBusy={isBusy}
                  onAdminDeleteStation={onAdminDeleteStation}
                  onAdminOpenEditor={onAdminOpenEditor}
                  onAdminToggleStationVerification={onAdminToggleStationVerification}
                  onQuickReportStation={onQuickReportStation}
                  onSubmitStationReview={onSubmitStationReview}
                  onRequestReportStation={onRequestReportStation}
                  station={station}
                />
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
