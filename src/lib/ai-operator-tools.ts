import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeAppProfileAdminInput, normalizeParkingSiteAdminInput } from "@/lib/admin-parkings";
import {
  STATION_OPTIONAL_COLUMNS,
  stripStationOptionalFields,
  withStationOptionalDefaults,
} from "@/lib/admin-stations-compat";
import { normalizeStationAdminInput } from "@/lib/admin-stations";
import { normalizeAgentSuggestionInput } from "@/lib/agent-suggestions";
import { applyParkingUpdate } from "@/lib/parking-updates";
import { reviewCommunityContribution } from "@/lib/contributor-rewards";
import {
  getMissingAgentSuggestionsMessage,
  getMissingAppProfilesMessage,
  getMissingContributionModerationMessage,
  getMissingParkingSitesMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfileAdminInput, AppProfileAdminRow, ParkingSiteAdminInput } from "@/lib/admin-parking-types";
import type { StationAdminInput, StationAdminRow } from "@/lib/admin-types";
import type { AgentReportSuggestion, ParkingSite } from "@/lib/types";

type JsonObject = Record<string, unknown>;

export const AI_OPERATOR_TOOL_NAMES = [
  "tools.list",
  "stations.search",
  "stations.create",
  "stations.update",
  "fuel-reports.search",
  "parking-sites.search",
  "parking-sites.create",
  "parking-sites.update",
  "parking-sites.report-status",
  "parking-updates.search",
  "profiles.search",
  "profiles.create",
  "profiles.update",
  "traffic-incidents.search",
  "traffic-incidents.resolve",
  "place-reports.search",
  "place-reports.review",
  "ai-suggestions.search",
  "ai-suggestions.create",
  "ai-suggestions.review",
] as const;

export type AiOperatorToolName = (typeof AI_OPERATOR_TOOL_NAMES)[number];

type ToolDefinition = {
  description: string;
  mode: "read" | "write";
  name: AiOperatorToolName;
  note?: string;
};

export const AI_OPERATOR_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { name: "tools.list", mode: "read", description: "Lista las herramientas disponibles en el webhook." },
  { name: "stations.search", mode: "read", description: "Busca estaciones por nombre, zona o direccion." },
  { name: "stations.create", mode: "write", description: "Crea una estacion nueva en el catalogo admin." },
  { name: "stations.update", mode: "write", description: "Actualiza una estacion existente usando cambios parciales." },
  { name: "fuel-reports.search", mode: "read", description: "Lee reportes recientes de combustible por estacion." },
  { name: "parking-sites.search", mode: "read", description: "Busca parqueos por codigo, nombre, zona o estado." },
  { name: "parking-sites.create", mode: "write", description: "Crea un nuevo parqueo administrable." },
  { name: "parking-sites.update", mode: "write", description: "Actualiza metadatos de un parqueo existente." },
  {
    name: "parking-sites.report-status",
    mode: "write",
    description: "Actualiza disponibilidad/estado de un parqueo y guarda historial.",
  },
  { name: "parking-updates.search", mode: "read", description: "Consulta historial reciente de cambios en parqueos." },
  { name: "profiles.search", mode: "read", description: "Busca perfiles operativos para parqueos y revisores." },
  { name: "profiles.create", mode: "write", description: "Crea un perfil operativo nuevo." },
  { name: "profiles.update", mode: "write", description: "Actualiza un perfil operativo existente." },
  { name: "traffic-incidents.search", mode: "read", description: "Consulta incidentes viales activos o resueltos." },
  {
    name: "traffic-incidents.resolve",
    mode: "write",
    description: "Marca un incidente como resuelto.",
    note: "No crea incidentes IA directos. Para eso usa ai-suggestions.create.",
  },
  { name: "place-reports.search", mode: "read", description: "Consulta denuncias pendientes o revisadas." },
  { name: "place-reports.review", mode: "write", description: "Aprueba o rechaza una denuncia con notas." },
  { name: "ai-suggestions.search", mode: "read", description: "Consulta sugerencias generadas por IA." },
  {
    name: "ai-suggestions.create",
    mode: "write",
    description: "Crea una sugerencia IA revisable por admin.",
    note: "Usa este canal para incidentes, reportes o avisos sinteticos.",
  },
  { name: "ai-suggestions.review", mode: "write", description: "Aprueba o rechaza una sugerencia IA." },
] as const;

export type ParsedAiOperatorCall = {
  dryRun: boolean;
  input: JsonObject;
  provider: string | null;
  sourceLabel: string;
  tool: AiOperatorToolName;
};

function getMissingStationsMessage() {
  return "Falta la tabla stations. Ejecuta las migraciones supabase/001_reset_all.sql y supabase/002_admin_station_fields.sql.";
}

function getMissingReportsMessage() {
  return "Falta la tabla reports. Ejecuta la migracion supabase/001_reset_all.sql.";
}

function getMissingTrafficIncidentsMessage() {
  return "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.";
}

function getMissingPlaceReportsMessage() {
  return "Falta la tabla place_reports. Ejecuta la migracion supabase/008_place_reports.sql.";
}

function toObject(value: unknown, errorMessage = "El input debe ser un objeto.") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return value as JsonObject;
}

function getOptionalTrimmedText(value: unknown, maxLength = 160) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("Se esperaba un texto.");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function getSearchPattern(value: string) {
  return `%${value.replace(/[,%]/g, " ").trim()}%`;
}

function getSearchLimit(value: unknown, fallback = 10) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(50, Math.max(1, Math.round(parsed)));
}

function getRequiredId(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} invalido.`);
  }

  return Math.round(parsed);
}

function getOptionalNonNegativeInteger(value: unknown, label: string) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} no es valido.`);
  }

  const rounded = Math.round(parsed);
  if (rounded < 0) {
    throw new Error(`${label} no puede ser negativo.`);
  }

  return rounded;
}

function getNullableIntegerInput(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value == null || value === "") return null;
  return getOptionalNonNegativeInteger(value, label);
}

function getNullableTextInput(value: unknown, maxLength = 240) {
  if (value === undefined) return undefined;
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("Se esperaba un texto.");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function getBooleanFlag(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function buildSearchOr(columns: string[], query: string) {
  const pattern = getSearchPattern(query);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}

function sanitizeProfileRow(row: AppProfileAdminRow | Record<string, unknown>, includeAccessToken: boolean) {
  const { manager_access_token, phone_key, whatsapp_key, ...rest } = row as Record<string, unknown>;

  return includeAccessToken
    ? { ...rest, manager_access_token }
    : { ...rest, has_manager_access_token: Boolean(manager_access_token) };
}

function buildReviewerLabel(sourceLabel: string, provider: string | null) {
  const safeSource = sourceLabel.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 80) || "ai-operator";
  const safeProvider = provider?.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24) || "custom";
  return `${safeProvider}:${safeSource}`;
}

export function getAiOperatorWebhookSecret() {
  const secret =
    process.env.AI_OPERATOR_WEBHOOK_SECRET?.trim() ||
    process.env.AI_AGENT_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("Falta AI_OPERATOR_WEBHOOK_SECRET o AI_AGENT_WEBHOOK_SECRET.");
  }

  return secret;
}

export function computeAiOperatorWebhookSignature(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function isValidAiOperatorWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const expectedSignature = computeAiOperatorWebhookSignature(rawBody, getAiOperatorWebhookSecret());
  const actualBuffer = Buffer.from(signature.trim().toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (actualBuffer.length === 0 || actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function parseAiOperatorCall(body: Record<string, unknown>): ParsedAiOperatorCall {
  const tool = typeof body.tool === "string" ? body.tool.trim() : "";
  if (!AI_OPERATOR_TOOL_NAMES.includes(tool as AiOperatorToolName)) {
    throw new Error("La herramienta solicitada no esta soportada por este webhook.");
  }

  const sourceLabel = getOptionalTrimmedText(body.sourceLabel, 80) ?? "ai-operator";
  const provider = getOptionalTrimmedText(body.provider, 24);

  return {
    dryRun: body.dryRun === true,
    input: toObject(body.input ?? {}),
    provider,
    sourceLabel,
    tool: tool as AiOperatorToolName,
  };
}

async function searchStations(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const city = getOptionalTrimmedText(input.city, 80);
  const zone = getOptionalTrimmedText(input.zone, 80);
  const isActive = getBooleanFlag(input.isActive);
  const isVerified = getBooleanFlag(input.isVerified);

  let query = supabase.from("stations").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (q) {
    query = query.or(buildSearchOr(["name", "address", "zone", "city"], q));
  }
  if (city) {
    query = query.ilike("city", getSearchPattern(city));
  }
  if (zone) {
    query = query.ilike("zone", getSearchPattern(zone));
  }
  if (typeof isActive === "boolean") {
    query = query.eq("is_active", isActive);
  }
  if (typeof isVerified === "boolean") {
    query = query.eq("is_verified", isVerified);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "stations")) {
    throw new Error(getMissingStationsMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function createStation(input: JsonObject, dryRun: boolean) {
  const payload = {
    ...normalizeStationAdminInput(input as unknown as StationAdminInput),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, payload };
  }

  const supabase = getAdminSupabase();
  let { data, error } = await supabase.from("stations").insert(payload).select("*").single();

  if (isMissingColumnError(error, "stations", STATION_OPTIONAL_COLUMNS)) {
    const legacyResult = await supabase
      .from("stations")
      .insert(stripStationOptionalFields(payload))
      .select("*")
      .single();

    data = legacyResult.data
      ? withStationOptionalDefaults(legacyResult.data as Partial<StationAdminRow>)
      : null;
    error = legacyResult.error;
  }

  if (isMissingTableError(error, "stations")) {
    throw new Error(getMissingStationsMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear la estacion.");
  }

  return { ok: true, station: data };
}

async function updateStation(input: JsonObject, dryRun: boolean) {
  const stationId = getRequiredId(input.id, "ID de estacion");
  const changes = toObject(input.changes ?? {}, "Debes enviar un objeto changes.");
  const supabase = getAdminSupabase();
  const currentResult = await supabase.from("stations").select("*").eq("id", stationId).single();

  if (isMissingTableError(currentResult.error, "stations")) {
    throw new Error(getMissingStationsMessage());
  }
  if (currentResult.error || !currentResult.data) {
    throw new Error(currentResult.error?.message || "Estacion no encontrada.");
  }

  const mergedInput = {
    ...(currentResult.data as StationAdminRow),
    ...changes,
  } as StationAdminInput;
  const payload = {
    ...normalizeStationAdminInput(mergedInput),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, id: stationId, payload };
  }

  let { data, error } = await supabase
    .from("stations")
    .update(payload)
    .eq("id", stationId)
    .select("*")
    .single();

  if (isMissingColumnError(error, "stations", STATION_OPTIONAL_COLUMNS)) {
    const legacyResult = await supabase
      .from("stations")
      .update(stripStationOptionalFields(payload))
      .eq("id", stationId)
      .select("*")
      .single();

    data = legacyResult.data
      ? withStationOptionalDefaults(legacyResult.data as Partial<StationAdminRow>)
      : null;
    error = legacyResult.error;
  }

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar la estacion.");
  }

  return { ok: true, station: data };
}

async function searchFuelReports(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const stationId =
    input.stationId == null || input.stationId === ""
      ? null
      : getRequiredId(input.stationId, "ID de estacion");
  const fuelType = getOptionalTrimmedText(input.fuelType, 24);

  let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(limit);
  if (stationId != null) {
    query = query.eq("station_id", stationId);
  }
  if (fuelType) {
    query = query.eq("fuel_type", fuelType);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "reports")) {
    throw new Error(getMissingReportsMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function searchParkingSites(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const status = getOptionalTrimmedText(input.status, 20);
  const managerProfileId =
    input.managerProfileId == null || input.managerProfileId === ""
      ? null
      : getRequiredId(input.managerProfileId, "ID de perfil");
  const isActive = getBooleanFlag(input.isActive);
  const isPublished = getBooleanFlag(input.isPublished);

  let query = supabase
    .from("parking_sites")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (q) {
    query = query.or(buildSearchOr(["code", "name", "address", "zone", "city"], q));
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (managerProfileId != null) {
    query = query.eq("manager_profile_id", managerProfileId);
  }
  if (typeof isActive === "boolean") {
    query = query.eq("is_active", isActive);
  }
  if (typeof isPublished === "boolean") {
    query = query.eq("is_published", isPublished);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "parking_sites")) {
    throw new Error(getMissingParkingSitesMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function createParkingSite(input: JsonObject, dryRun: boolean) {
  const payload = {
    ...normalizeParkingSiteAdminInput(input as unknown as ParkingSiteAdminInput),
    last_update_source: "admin",
    last_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, payload };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("parking_sites")
    .insert(payload)
    .select("*")
    .single();

  if (isMissingTableError(error, "parking_sites")) {
    throw new Error(getMissingParkingSitesMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el parqueo.");
  }

  return { ok: true, parkingSite: data };
}

async function updateParkingSite(input: JsonObject, dryRun: boolean) {
  const parkingSiteId = getRequiredId(input.id, "ID de parqueo");
  const changes = toObject(input.changes ?? {}, "Debes enviar un objeto changes.");
  const supabase = getAdminSupabase();
  const currentResult = await supabase.from("parking_sites").select("*").eq("id", parkingSiteId).single();

  if (isMissingTableError(currentResult.error, "parking_sites")) {
    throw new Error(getMissingParkingSitesMessage());
  }
  if (currentResult.error || !currentResult.data) {
    throw new Error(currentResult.error?.message || "Parqueo no encontrado.");
  }

  const mergedInput = {
    ...(currentResult.data as ParkingSite),
    ...changes,
  } as ParkingSiteAdminInput;
  const payload = {
    ...normalizeParkingSiteAdminInput(mergedInput),
    last_update_source: "admin",
    last_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, id: parkingSiteId, payload };
  }

  const { data, error } = await supabase
    .from("parking_sites")
    .update(payload)
    .eq("id", parkingSiteId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar el parqueo.");
  }

  return { ok: true, parkingSite: data };
}

async function reportParkingStatus(
  input: JsonObject,
  dryRun: boolean,
  meta: Pick<ParsedAiOperatorCall, "provider" | "sourceLabel">
) {
  const parkingSiteId = getRequiredId(input.id, "ID de parqueo");
  const status = getOptionalTrimmedText(input.status, 20);
  const availableSpots = getNullableIntegerInput(input.availableSpots, "Los cupos disponibles");
  const pricingText = getNullableTextInput(input.pricingText, 160);
  const note = getNullableTextInput(input.note, 240);

  if (!status) {
    throw new Error("El estado del parqueo es obligatorio.");
  }

  const supabase = getAdminSupabase();
  const currentResult = await supabase
    .from("parking_sites")
    .select("id,total_spots,available_spots,pricing_text,status")
    .eq("id", parkingSiteId)
    .single();

  if (isMissingTableError(currentResult.error, "parking_sites")) {
    throw new Error(getMissingParkingSitesMessage());
  }
  if (currentResult.error || !currentResult.data) {
    throw new Error(currentResult.error?.message || "Parqueo no encontrado.");
  }

  const currentSite = currentResult.data as {
    available_spots: number | null;
    id: number;
    pricing_text: string | null;
    status: string;
    total_spots: number | null;
  };
  const nextAvailableSpots =
    availableSpots === undefined ? currentSite.available_spots : availableSpots;
  const nextPricingText =
    pricingText === undefined ? currentSite.pricing_text : pricingText;

  if (
    currentSite.total_spots != null &&
    nextAvailableSpots != null &&
    nextAvailableSpots > currentSite.total_spots
  ) {
    throw new Error("Los cupos disponibles no pueden superar la capacidad total.");
  }

  if (dryRun) {
    return {
      ok: true,
      id: parkingSiteId,
      payload: {
        available_spots: nextAvailableSpots,
        pricing_text: nextPricingText,
        status,
      },
    };
  }

  const site = await applyParkingUpdate({
    availableSpots,
    note,
    pricingText,
    rawPayload: {
      provider: meta.provider,
      source_label: meta.sourceLabel,
      tool: "parking-sites.report-status",
    },
    siteId: parkingSiteId,
    source: "admin",
    status: status as ParkingSite["status"],
  });

  return { ok: true, parkingSite: site };
}

async function searchParkingUpdates(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const parkingSiteId =
    input.parkingSiteId == null || input.parkingSiteId === ""
      ? null
      : getRequiredId(input.parkingSiteId, "ID de parqueo");

  let query = supabase
    .from("parking_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (parkingSiteId != null) {
    query = query.eq("parking_site_id", parkingSiteId);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "parking_updates")) {
    throw new Error(getMissingParkingSitesMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function searchProfiles(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const role = getOptionalTrimmedText(input.role, 40);
  const isActive = getBooleanFlag(input.isActive);
  const includeAccessToken = input.includeAccessToken === true;

  let query = supabase.from("app_profiles").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (q) {
    query = query.or(buildSearchOr(["full_name", "email", "phone", "whatsapp_number"], q));
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (typeof isActive === "boolean") {
    query = query.eq("is_active", isActive);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "app_profiles")) {
    throw new Error(getMissingAppProfilesMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return {
    count: data?.length ?? 0,
    items: (data ?? []).map((item) => sanitizeProfileRow(item, includeAccessToken)),
  };
}

async function createProfile(input: JsonObject, dryRun: boolean) {
  const includeAccessToken = input.includeAccessToken === true;
  const profileInput = { ...input };
  delete profileInput.includeAccessToken;

  const payload = {
    ...normalizeAppProfileAdminInput(profileInput as unknown as AppProfileAdminInput),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, profile: sanitizeProfileRow(payload, includeAccessToken) };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from("app_profiles").insert(payload).select("*").single();

  if (isMissingTableError(error, "app_profiles")) {
    throw new Error(getMissingAppProfilesMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear el perfil.");
  }

  return { ok: true, profile: sanitizeProfileRow(data, includeAccessToken) };
}

async function updateProfile(input: JsonObject, dryRun: boolean) {
  const profileId = getRequiredId(input.id, "ID de perfil");
  const changes = toObject(input.changes ?? {}, "Debes enviar un objeto changes.");
  const includeAccessToken = input.includeAccessToken === true;
  const supabase = getAdminSupabase();
  const currentResult = await supabase.from("app_profiles").select("*").eq("id", profileId).single();

  if (isMissingTableError(currentResult.error, "app_profiles")) {
    throw new Error(getMissingAppProfilesMessage());
  }
  if (currentResult.error || !currentResult.data) {
    throw new Error(currentResult.error?.message || "Perfil no encontrado.");
  }

  const currentProfile = currentResult.data as AppProfileAdminRow;
  const mergedInput = {
    ...currentProfile,
    ...changes,
  } as AppProfileAdminInput;
  const payload = {
    ...normalizeAppProfileAdminInput(mergedInput, currentProfile.manager_access_token),
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { ok: true, id: profileId, profile: sanitizeProfileRow(payload, includeAccessToken) };
  }

  const { data, error } = await supabase
    .from("app_profiles")
    .update(payload)
    .eq("id", profileId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo actualizar el perfil.");
  }

  return { ok: true, profile: sanitizeProfileRow(data, includeAccessToken) };
}

async function searchTrafficIncidents(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const status = getOptionalTrimmedText(input.status, 20);
  const incidentType = getOptionalTrimmedText(input.incidentType, 20);

  let query = supabase
    .from("traffic_incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (q) {
    query = query.ilike("description", getSearchPattern(q));
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (incidentType) {
    query = query.eq("incident_type", incidentType);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "traffic_incidents")) {
    throw new Error(getMissingTrafficIncidentsMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function resolveTrafficIncident(input: JsonObject, dryRun: boolean) {
  const incidentId = getRequiredId(input.id, "ID de incidente");
  const payload = {
    resolved_at: new Date().toISOString(),
    status: "resolved",
  };

  if (dryRun) {
    return { ok: true, id: incidentId, payload };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("traffic_incidents")
    .update(payload)
    .eq("id", incidentId)
    .select("*")
    .single();

  if (isMissingTableError(error, "traffic_incidents")) {
    throw new Error(getMissingTrafficIncidentsMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo cerrar el incidente.");
  }

  return { ok: true, incident: data };
}

async function searchPlaceReports(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const status = getOptionalTrimmedText(input.status, 20);
  const targetType = getOptionalTrimmedText(input.targetType, 20);

  let query = supabase.from("place_reports").select("*").order("created_at", { ascending: false }).limit(limit);
  if (q) {
    query = query.ilike("target_name", getSearchPattern(q));
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (targetType) {
    query = query.eq("target_type", targetType);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "place_reports")) {
    throw new Error(getMissingPlaceReportsMessage());
  }
  if (isMissingColumnError(error, "place_reports", ["status"])) {
    throw new Error(getMissingContributionModerationMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function reviewPlaceReport(
  input: JsonObject,
  dryRun: boolean,
  meta: Pick<ParsedAiOperatorCall, "provider" | "sourceLabel">
) {
  const reportId = getRequiredId(input.id, "ID de denuncia");
  const action = input.action === "reject" ? "reject" : "approve";
  const reviewNotes = getNullableTextInput(input.reviewNotes, 500);
  const pointsAwarded = getOptionalNonNegativeInteger(input.pointsAwarded, "Los puntos");
  const reviewerLabel = buildReviewerLabel(meta.sourceLabel, meta.provider);

  if (dryRun) {
    return {
      ok: true,
      id: reportId,
      payload: {
        review_notes: reviewNotes ?? null,
        reviewed_by_email: reviewerLabel,
        status: action === "approve" ? "approved" : "rejected",
      },
    };
  }

  const supabase = getAdminSupabase();
  const reviewedAt = new Date().toISOString();
  const { data: updatedReport, error: reportError } = await supabase
    .from("place_reports")
    .update({
      review_notes: reviewNotes ?? null,
      reviewed_at: reviewedAt,
      reviewed_by_email: reviewerLabel,
      status: action === "approve" ? "approved" : "rejected",
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (isMissingTableError(reportError, "place_reports")) {
    throw new Error(getMissingPlaceReportsMessage());
  }
  if (
    isMissingColumnError(reportError, "place_reports", [
      "status",
      "review_notes",
      "reviewed_at",
      "reviewed_by_email",
    ])
  ) {
    throw new Error(getMissingContributionModerationMessage());
  }
  if (reportError || !updatedReport) {
    throw new Error(reportError?.message || "No se pudo revisar la denuncia.");
  }

  const { data: contribution } = await supabase
    .from("community_contributions")
    .select("id")
    .eq("source_type", "place_report")
    .eq("source_id", reportId)
    .maybeSingle();

  if (contribution?.id != null) {
    try {
      await reviewCommunityContribution({
        action,
        contributionId: Number(contribution.id),
        pointsAwarded,
        reviewNotes: reviewNotes ?? null,
        reviewerEmail: reviewerLabel,
      });
    } catch (contributionError) {
      if (
        contributionError instanceof Error &&
        !contributionError.message.toLowerCase().includes("community_contributions")
      ) {
        throw contributionError;
      }
    }
  }

  return { ok: true, report: updatedReport };
}

async function searchAiSuggestions(input: JsonObject) {
  const supabase = getAdminSupabase();
  const limit = getSearchLimit(input.limit);
  const q = getOptionalTrimmedText(input.q, 80);
  const kind = getOptionalTrimmedText(input.kind, 40);
  const status = getOptionalTrimmedText(input.status, 40);
  const visibility = getOptionalTrimmedText(input.visibility, 40);

  let query = supabase
    .from("agent_report_suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (q) {
    query = query.or(buildSearchOr(["title", "summary", "source_label", "zone", "city"], q));
  }
  if (kind) {
    query = query.eq("kind", kind);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (visibility) {
    query = query.eq("visibility", visibility);
  }

  const { data, error } = await query;
  if (isMissingTableError(error, "agent_report_suggestions")) {
    throw new Error(getMissingAgentSuggestionsMessage());
  }
  if (error) {
    throw new Error(error.message);
  }

  return { count: data?.length ?? 0, items: data ?? [] };
}

async function createAiSuggestion(
  input: JsonObject,
  dryRun: boolean,
  meta: Pick<ParsedAiOperatorCall, "provider" | "sourceLabel">
) {
  const payload = normalizeAgentSuggestionInput({
    provider: meta.provider ?? input.provider,
    sourceLabel: input.sourceLabel ?? meta.sourceLabel,
    ...input,
  });

  if (dryRun) {
    return { ok: true, payload };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("agent_report_suggestions")
    .insert(payload)
    .select("*")
    .single();

  if (isMissingTableError(error, "agent_report_suggestions")) {
    throw new Error(getMissingAgentSuggestionsMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo crear la sugerencia.");
  }

  return { ok: true, suggestion: data };
}

async function reviewAiSuggestion(
  input: JsonObject,
  dryRun: boolean,
  meta: Pick<ParsedAiOperatorCall, "provider" | "sourceLabel">
) {
  const suggestionId = getRequiredId(input.id, "ID de sugerencia");
  const action = input.action === "reject" ? "reject" : "approve";
  const reviewNotes = getNullableTextInput(input.reviewNotes, 500);
  const visibility = input.visibility === "public_demo" ? "public_demo" : "admin_only";
  const reviewerLabel = buildReviewerLabel(meta.sourceLabel, meta.provider);

  if (dryRun) {
    return {
      ok: true,
      id: suggestionId,
      payload: {
        review_notes: reviewNotes ?? null,
        reviewed_by_email: reviewerLabel,
        status: action === "approve" ? "approved" : "rejected",
        visibility,
      },
    };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("agent_report_suggestions")
    .update({
      review_notes: reviewNotes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: reviewerLabel,
      status: action === "approve" ? "approved" : "rejected",
      visibility,
    })
    .eq("id", suggestionId)
    .select("*")
    .single();

  if (isMissingTableError(error, "agent_report_suggestions")) {
    throw new Error(getMissingAgentSuggestionsMessage());
  }
  if (error || !data) {
    throw new Error(error?.message || "No se pudo revisar la sugerencia.");
  }

  return { ok: true, suggestion: data as AgentReportSuggestion };
}

export async function executeAiOperatorTool(call: ParsedAiOperatorCall) {
  switch (call.tool) {
    case "tools.list":
      return {
        tools: AI_OPERATOR_TOOL_DEFINITIONS,
        write_policy: {
          dry_run_supported: true,
          no_delete_tools: true,
          preferred_channel_for_synthetic_events: "ai-suggestions.create",
        },
      };
    case "stations.search":
      return searchStations(call.input);
    case "stations.create":
      return createStation(call.input, call.dryRun);
    case "stations.update":
      return updateStation(call.input, call.dryRun);
    case "fuel-reports.search":
      return searchFuelReports(call.input);
    case "parking-sites.search":
      return searchParkingSites(call.input);
    case "parking-sites.create":
      return createParkingSite(call.input, call.dryRun);
    case "parking-sites.update":
      return updateParkingSite(call.input, call.dryRun);
    case "parking-sites.report-status":
      return reportParkingStatus(call.input, call.dryRun, call);
    case "parking-updates.search":
      return searchParkingUpdates(call.input);
    case "profiles.search":
      return searchProfiles(call.input);
    case "profiles.create":
      return createProfile(call.input, call.dryRun);
    case "profiles.update":
      return updateProfile(call.input, call.dryRun);
    case "traffic-incidents.search":
      return searchTrafficIncidents(call.input);
    case "traffic-incidents.resolve":
      return resolveTrafficIncident(call.input, call.dryRun);
    case "place-reports.search":
      return searchPlaceReports(call.input);
    case "place-reports.review":
      return reviewPlaceReport(call.input, call.dryRun, call);
    case "ai-suggestions.search":
      return searchAiSuggestions(call.input);
    case "ai-suggestions.create":
      return createAiSuggestion(call.input, call.dryRun, call);
    case "ai-suggestions.review":
      return reviewAiSuggestion(call.input, call.dryRun, call);
    default: {
      const unknownTool: never = call.tool;
      throw new Error(`Herramienta no manejada: ${unknownTool}`);
    }
  }
}
