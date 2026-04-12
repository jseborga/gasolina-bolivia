import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneKey } from "@/lib/parking";
import { applyParkingUpdate } from "@/lib/parking-updates";
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { AppProfile, ParkingSite, ParkingStatus } from "@/lib/types";

function getNestedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractSender(payload: Record<string, any>) {
  return (
    getNestedString(payload?.data?.key?.remoteJid) ||
    getNestedString(payload?.data?.participant) ||
    getNestedString(payload?.sender) ||
    getNestedString(payload?.from) ||
    null
  );
}

function extractMessageText(payload: Record<string, any>) {
  return (
    getNestedString(payload?.data?.message?.conversation) ||
    getNestedString(payload?.data?.message?.extendedTextMessage?.text) ||
    getNestedString(payload?.message?.conversation) ||
    getNestedString(payload?.message?.extendedTextMessage?.text) ||
    getNestedString(payload?.text) ||
    null
  );
}

function parseStatusToken(token: string): ParkingStatus | null {
  switch (token) {
    case "ABIERTO":
    case "OPEN":
    case "DISPONIBLE":
      return "open";
    case "LLENO":
    case "FULL":
    case "COMPLETO":
      return "full";
    case "CERRADO":
    case "CLOSE":
    case "CLOSED":
      return "closed";
    case "UNKNOWN":
    case "SIN_DATO":
    case "SINDATO":
      return "unknown";
    default:
      return null;
  }
}

function sanitizeCommandToken(token?: string) {
  return (token ?? "").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase();
}

function parseWebhookCommand(text: string, sites: ParkingSite[]) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { ignoredReason: "Mensaje vacio." } as const;
  }

  let site: ParkingSite | null = null;
  let startIndex = 0;
  const firstToken = sanitizeCommandToken(tokens[0]);

  if (sites.length === 1) {
    site = sites[0];
  } else {
    site = sites.find((candidate) => candidate.code.toUpperCase() === firstToken) ?? null;
    if (site) {
      startIndex = 1;
    }
  }

  if (!site) {
    return {
      ignoredReason:
        sites.length > 1
          ? "Falta el codigo del parqueo al inicio del mensaje."
          : "No se encontro parqueo asignado.",
    } as const;
  }

  const status = parseStatusToken(sanitizeCommandToken(tokens[startIndex]));
  if (!status) {
    return { ignoredReason: "No se reconocio el estado del parqueo." } as const;
  }

  let availableSpots: number | undefined;
  let noteStartIndex = startIndex + 1;
  const countToken = tokens[startIndex + 1];

  if (countToken && /^\d+$/.test(countToken)) {
    availableSpots = Number(countToken);
    noteStartIndex = startIndex + 2;
  }

  const note = tokens.slice(noteStartIndex).join(" ").trim() || undefined;

  return {
    availableSpots,
    note,
    site,
    status,
  } as const;
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
    const receivedSecret = request.headers.get("x-evolution-secret")?.trim();

    if (configuredSecret && configuredSecret !== receivedSecret) {
      return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, any>;
    const senderKey = normalizePhoneKey(extractSender(body));
    const text = extractMessageText(body);

    if (!senderKey || !text) {
      return NextResponse.json({
        ignored: true,
        ok: true,
        reason: "No se encontro remitente o mensaje util.",
      });
    }

    const supabase = getAdminSupabase();
    const profileQuery = await supabase
      .from("app_profiles")
      .select("*")
      .eq("whatsapp_key", senderKey)
      .eq("is_active", true)
      .maybeSingle();

    if (isMissingTableError(profileQuery.error, "app_profiles")) {
      return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
    }

    let profile = profileQuery.data as AppProfile | null;
    let profileError = profileQuery.error;

    if (!profile && !profileError) {
      const fallbackQuery = await supabase
        .from("app_profiles")
        .select("*")
        .eq("phone_key", senderKey)
        .eq("is_active", true)
        .maybeSingle();

      if (isMissingTableError(fallbackQuery.error, "app_profiles")) {
        return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
      }

      profile = fallbackQuery.data as AppProfile | null;
      profileError = fallbackQuery.error;
    }

    if (profileError || !profile) {
      return NextResponse.json({
        ignored: true,
        ok: true,
        reason: "No existe un perfil activo asociado al remitente.",
      });
    }

    const sitesQuery = await supabase
      .from("parking_sites")
      .select("*")
      .eq("manager_profile_id", profile.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (isMissingTableError(sitesQuery.error, "parking_sites")) {
      return NextResponse.json({ error: getMissingParkingSitesMessage() }, { status: 400 });
    }

    if (sitesQuery.error) {
      return NextResponse.json({ error: sitesQuery.error.message }, { status: 400 });
    }

    const sites = (sitesQuery.data ?? []) as ParkingSite[];
    if (sites.length === 0) {
      return NextResponse.json({
        ignored: true,
        ok: true,
        reason: "El perfil no tiene parqueos asignados.",
      });
    }

    const parsed = parseWebhookCommand(text, sites);
    if ("ignoredReason" in parsed) {
      return NextResponse.json({
        ignored: true,
        ok: true,
        reason: parsed.ignoredReason,
      });
    }

    const updatedSite = await applyParkingUpdate({
      availableSpots: parsed.availableSpots,
      note: parsed.note,
      parkingProfileId: profile.id,
      rawPayload: body,
      siteId: parsed.site.id,
      source: "webhook_evolution",
      status: parsed.status,
    });

    return NextResponse.json({
      ok: true,
      siteId: updatedSite.id,
      status: updatedSite.status,
      availableSpots: updatedSite.available_spots,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
