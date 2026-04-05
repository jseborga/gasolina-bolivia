import { AvailabilityStatus, QueueStatus, Report } from "./types";

export function formatAvailability(status: AvailabilityStatus) {
  switch (status) {
    case "si_hay": return "Sí hay";
    case "no_hay": return "No hay";
    default: return "Sin dato";
  }
}

export function formatQueue(status: QueueStatus) {
  switch (status) {
    case "corta": return "Fila corta";
    case "media": return "Fila media";
    case "larga": return "Fila larga";
    default: return "Sin dato";
  }
}

export function formatFuelType(fuel: Report["fuel_type"]) {
  switch (fuel) {
    case "diesel": return "Diésel";
    case "premium": return "Premium";
    default: return "Especial";
  }
}

export function getFreshness(reportDate: string) {
  const diffMinutes = (Date.now() - new Date(reportDate).getTime()) / 60000;
  if (diffMinutes <= 30) return { label: "Reciente", className: "bg-emerald-100 text-emerald-700" };
  if (diffMinutes <= 90) return { label: "Todavía útil", className: "bg-amber-100 text-amber-700" };
  return { label: "Desactualizado", className: "bg-slate-200 text-slate-600" };
}

export function formatRelativeTime(reportDate: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(reportDate).getTime()) / 60000));
  if (diffMinutes < 1) return "Hace instantes";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return `Hace ${Math.floor(diffHours / 24)} d`;
}
