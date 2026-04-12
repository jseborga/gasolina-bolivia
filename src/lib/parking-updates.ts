import { getAdminSupabase } from "@/lib/supabase-server";
import type { ParkingStatus } from "@/lib/types";

type ParkingUpdateParams = {
  availableSpots?: number | null;
  note?: string | null;
  parkingProfileId?: number | null;
  pricingText?: string | null;
  rawPayload?: Record<string, unknown> | null;
  siteId: number;
  source: "admin" | "manager_portal" | "webhook_evolution";
  status: ParkingStatus;
};

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableInteger(value?: number | null) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error("Los cupos disponibles no son validos.");
  }

  const rounded = Math.round(value);
  if (rounded < 0) {
    throw new Error("Los cupos disponibles no pueden ser negativos.");
  }

  return rounded;
}

export async function applyParkingUpdate(params: ParkingUpdateParams) {
  const supabase = getAdminSupabase();
  const availableSpots = normalizeNullableInteger(params.availableSpots ?? null);
  const pricingText = normalizeNullableText(params.pricingText);
  const note = normalizeNullableText(params.note);
  const now = new Date().toISOString();
  const { data: currentSite, error: currentSiteError } = await supabase
    .from("parking_sites")
    .select("id,total_spots,available_spots,pricing_text")
    .eq("id", params.siteId)
    .single();

  if (currentSiteError || !currentSite) {
    throw new Error(currentSiteError?.message || "No se pudo leer el parqueo.");
  }

  const nextAvailableSpots =
    params.availableSpots === undefined ? currentSite.available_spots : availableSpots;
  const nextPricingText =
    params.pricingText === undefined ? currentSite.pricing_text : pricingText;

  if (
    currentSite.total_spots != null &&
    nextAvailableSpots != null &&
    nextAvailableSpots > currentSite.total_spots
  ) {
    throw new Error("Los cupos disponibles no pueden superar la capacidad total.");
  }

  const siteUpdate = {
    available_spots: nextAvailableSpots,
    last_update_source: params.source,
    last_updated_at: now,
    pricing_text: nextPricingText,
    status: params.status,
    updated_at: now,
  };

  const { data: site, error: siteError } = await supabase
    .from("parking_sites")
    .update(siteUpdate)
    .eq("id", params.siteId)
    .select("*")
    .single();

  if (siteError || !site) {
    throw new Error(siteError?.message || "No se pudo actualizar el parqueo.");
  }

  const { error: historyError } = await supabase.from("parking_updates").insert({
    available_spots: nextAvailableSpots,
    note,
    parking_profile_id: params.parkingProfileId ?? null,
    parking_site_id: params.siteId,
    pricing_text: nextPricingText,
    raw_payload: params.rawPayload ?? {},
    source: params.source,
    status: params.status,
  });

  if (historyError) {
    throw new Error(historyError.message);
  }

  return site;
}
