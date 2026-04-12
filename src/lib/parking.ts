import type { AppProfileRole, ParkingStatus } from "@/lib/types";

export const APP_PROFILE_ROLE_OPTIONS: Array<{
  label: string;
  value: AppProfileRole;
}> = [
  { label: "Encargado de parqueo", value: "parking_manager" },
  { label: "Reportero confiable", value: "trusted_reporter" },
  { label: "Revisor", value: "reviewer" },
  { label: "Apoyo admin", value: "admin_assistant" },
];

export const PARKING_STATUS_OPTIONS: Array<{
  label: string;
  value: ParkingStatus;
}> = [
  { label: "Abierto", value: "open" },
  { label: "Lleno", value: "full" },
  { label: "Cerrado", value: "closed" },
  { label: "Sin dato", value: "unknown" },
];

export function getAppProfileRoleLabel(role: AppProfileRole) {
  return APP_PROFILE_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export function getParkingStatusLabel(status: ParkingStatus) {
  return PARKING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getParkingStatusPillClass(status: ParkingStatus) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700";
    case "full":
      return "bg-amber-100 text-amber-800";
    case "closed":
      return "bg-rose-100 text-rose-700";
    case "unknown":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function normalizePhoneKey(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || null;
}

export function formatParkingAvailability(availableSpots?: number | null, totalSpots?: number | null) {
  if (availableSpots == null && totalSpots == null) return "Sin cupos informados";
  if (availableSpots == null) return `${totalSpots} plazas totales`;
  if (totalSpots == null) return `${availableSpots} libres`;
  return `${availableSpots} libres de ${totalSpots}`;
}
