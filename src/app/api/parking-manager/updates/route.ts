import { NextResponse } from "next/server";
import { applyParkingUpdate } from "@/lib/parking-updates";
import { PARKING_STATUS_OPTIONS } from "@/lib/parking";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile, ParkingStatus } from "@/lib/types";

type ParkingManagerUpdateBody = {
  accessToken?: string;
  availableSpots?: number;
  note?: string;
  parkingSiteId?: number;
  pricingText?: string;
  status?: ParkingStatus;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParkingManagerUpdateBody;
    const accessToken = body.accessToken?.trim();
    const parkingSiteId = Number(body.parkingSiteId);
    const status = body.status ?? "unknown";

    if (!accessToken) {
      return NextResponse.json({ error: "Falta el token de acceso." }, { status: 400 });
    }

    if (!Number.isFinite(parkingSiteId)) {
      return NextResponse.json({ error: "El parqueo seleccionado no es valido." }, { status: 400 });
    }

    if (!PARKING_STATUS_OPTIONS.some((option) => option.value === status)) {
      return NextResponse.json({ error: "El estado no es valido." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("*")
      .eq("manager_access_token", accessToken)
      .eq("is_active", true)
      .maybeSingle();

    if (isMissingTableError(profileError, "app_profiles")) {
      return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
    }

    if (profileError || !profile) {
      return NextResponse.json({ error: "Token de gestion invalido." }, { status: 401 });
    }

    const typedProfile = profile as AppProfile;

    const { data: site, error: siteError } = await supabase
      .from("parking_sites")
      .select("id,manager_profile_id")
      .eq("id", parkingSiteId)
      .maybeSingle();

    if (isMissingTableError(siteError, "parking_sites")) {
      return NextResponse.json({ error: getMissingParkingSitesMessage() }, { status: 400 });
    }

    if (siteError || !site) {
      return NextResponse.json({ error: "Parqueo no encontrado." }, { status: 404 });
    }

    if (site.manager_profile_id !== typedProfile.id) {
      return NextResponse.json(
        { error: "Este perfil no tiene permiso para actualizar ese parqueo." },
        { status: 403 }
      );
    }

    const updatedSite = await applyParkingUpdate({
      availableSpots: body.availableSpots,
      note: body.note,
      parkingProfileId: typedProfile.id,
      pricingText: body.pricingText,
      siteId: parkingSiteId,
      source: "manager_portal",
      status,
    });

    return NextResponse.json({ ok: true, site: updatedSite });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
