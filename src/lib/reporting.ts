export function getAvailabilityLabel(value?: string | null) {
  if (value === "si_hay") return "Sí hay";
  if (value === "no_hay") return "No hay";
  return "Sin dato";
}

export function getFuelLabel(value?: string | null) {
  if (!value) return "Sin dato";
  if (value === "especial") return "Especial";
  if (value === "premium") return "Premium";
  if (value === "diesel") return "Diésel";
  return value;
}

export function getQueueLabel(value?: string | null) {
  if (!value || value === "sin_dato") return "Sin dato";
  if (value === "corta") return "Fila corta";
  if (value === "media") return "Fila media";
  if (value === "larga") return "Fila larga";
  return value;
}

export function getReportAgeMinutes(createdAt?: string | null) {
  if (!createdAt) return null;
  const value = new Date(createdAt).getTime();
  if (Number.isNaN(value)) return null;
  return Math.round((Date.now() - value) / 60000);
}

export function isRecentReport(createdAt?: string | null) {
  const age = getReportAgeMinutes(createdAt);
  return age != null && age <= 30;
}

export function getFreshness(createdAt?: string | null) {
  const age = getReportAgeMinutes(createdAt);

  if (age == null) {
    return {
      label: "Sin reporte",
      tone: "neutral",
    } as const;
  }

  if (age <= 30) {
    return {
      label: "Reciente",
      tone: "fresh",
    } as const;
  }

  if (age <= 90) {
    return {
      label: "Aún útil",
      tone: "warm",
    } as const;
  }

  return {
    label: "Desactualizado",
    tone: "stale",
  } as const;
}

export function formatReportDate(value?: string | null) {
  if (!value) return "Sin reporte";
  try {
    return new Date(value).toLocaleString("es-BO");
  } catch {
    return value;
  }
}
