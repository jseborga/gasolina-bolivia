import type {
  AgentReportSuggestion,
  AgentSuggestionKind,
  AgentSuggestionMode,
  AgentSuggestionProvider,
  AgentSuggestionStatus,
  AgentSuggestionVisibility,
} from "@/lib/types";

const VALID_PROVIDERS: AgentSuggestionProvider[] = ["openai", "anthropic", "custom"];
const VALID_KINDS: AgentSuggestionKind[] = [
  "fuel_report",
  "traffic_incident",
  "parking_update",
  "place_report",
  "advisory",
];
const VALID_VISIBILITIES: AgentSuggestionVisibility[] = ["admin_only", "public_demo"];
const VALID_MODES: AgentSuggestionMode[] = ["ai_simulated", "ai_draft", "external_signal"];
const VALID_STATUSES: AgentSuggestionStatus[] = ["pending_review", "approved", "rejected"];

function normalizeText(value: unknown, maxLength: number) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeCoordinate(value: unknown, label: "latitud" | "longitud") {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`La ${label} no es valida.`);
  }

  if (label === "latitud" && (parsed < -90 || parsed > 90)) {
    throw new Error("La latitud debe estar entre -90 y 90.");
  }

  if (label === "longitud" && (parsed < -180 || parsed > 180)) {
    throw new Error("La longitud debe estar entre -180 y 180.");
  }

  return Number(parsed.toFixed(6));
}

function normalizeRadius(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("El radio no es valido.");
  }

  const rounded = Math.round(parsed);
  if (rounded < 50 || rounded > 5000) {
    throw new Error("El radio debe estar entre 50 y 5000 metros.");
  }

  return rounded;
}

function normalizeConfidence(value: unknown) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("La confianza no es valida.");
  }

  if (parsed < 0 || parsed > 1) {
    throw new Error("La confianza debe estar entre 0 y 1.");
  }

  return Number(parsed.toFixed(2));
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeEvidence(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function normalizeEnum<T extends string>(value: unknown, validValues: readonly T[], fallback: T) {
  return validValues.includes(value as T) ? (value as T) : fallback;
}

export function normalizeAgentSuggestionInput(body: Record<string, unknown>) {
  const title = normalizeText(body.title, 140);
  if (!title) {
    throw new Error("El titulo de la sugerencia es obligatorio.");
  }

  const sourceLabel = normalizeText(body.sourceLabel, 80);
  if (!sourceLabel) {
    throw new Error("La etiqueta del origen es obligatoria.");
  }

  const provider = normalizeEnum(body.provider, VALID_PROVIDERS, "custom");
  const kind = normalizeEnum(body.kind, VALID_KINDS, "advisory");
  const syntheticMode = normalizeEnum(body.syntheticMode, VALID_MODES, "ai_simulated");
  const visibility = normalizeEnum(body.visibility, VALID_VISIBILITIES, "admin_only");
  const status = normalizeEnum(body.status, VALID_STATUSES, "pending_review");

  return {
    city: normalizeText(body.city, 80),
    confidence: normalizeConfidence(body.confidence),
    criteria: normalizeObject(body.criteria),
    evidence: normalizeEvidence(body.evidence),
    kind,
    latitude: normalizeCoordinate(body.latitude, "latitud"),
    longitude: normalizeCoordinate(body.longitude, "longitud"),
    payload: normalizeObject(body.payload),
    provider,
    radius_meters: normalizeRadius(body.radiusMeters),
    source_label: sourceLabel,
    status,
    summary: normalizeText(body.summary, 500),
    synthetic_mode: syntheticMode,
    title,
    visibility,
    zone: normalizeText(body.zone, 80),
  };
}

export function toAgentSuggestion(row: Record<string, unknown>) {
  return {
    ...(row as unknown as AgentReportSuggestion),
    evidence: normalizeEvidence(row.evidence),
  };
}

export function getAgentSuggestionKindLabel(kind: AgentSuggestionKind) {
  switch (kind) {
    case "fuel_report":
      return "Reporte de combustible";
    case "traffic_incident":
      return "Incidente vial";
    case "parking_update":
      return "Actualizacion de parqueo";
    case "place_report":
      return "Denuncia de lugar";
    case "advisory":
    default:
      return "Aviso operativo";
  }
}
