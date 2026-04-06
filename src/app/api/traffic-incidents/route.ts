import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { TrafficIncident, TrafficIncidentType } from "@/lib/types";

const VALID_INCIDENT_TYPES: TrafficIncidentType[] = [
  "control_vial",
  "corte_via",
  "marcha",
  "accidente",
  "derrumbe",
  "otro",
];

const DEFAULT_DURATION_BY_TYPE: Record<TrafficIncidentType, number> = {
  accidente: 120,
  control_vial: 60,
  corte_via: 180,
  derrumbe: 360,
  marcha: 240,
  otro: 120,
};

function normalizeDurationMinutes(value: unknown, incidentType: TrafficIncidentType) {
  const parsed = typeof value === "number" ? value : Number(value);
  const fallback = DEFAULT_DURATION_BY_TYPE[incidentType] ?? 120;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed);
  return Math.min(720, Math.max(15, rounded));
}

function getIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

function normalizeCoordinateBucket(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(3));
}

function normalizeDescription(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.slice(0, 180);
}

function buildReviewerKey({
  ipAddress,
  latitudeBucket,
  longitudeBucket,
  visitorId,
}: {
  ipAddress: string | null;
  latitudeBucket: number | null;
  longitudeBucket: number | null;
  visitorId: string;
}) {
  return createHash("sha256")
    .update(
      [
        visitorId || "anon",
        ipAddress || "no-ip",
        latitudeBucket?.toFixed(3) || "no-lat",
        longitudeBucket?.toFixed(3) || "no-lng",
      ].join("|")
    )
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const incidentType = typeof body.incidentType === "string" ? body.incidentType : "";
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!VALID_INCIDENT_TYPES.includes(incidentType as TrafficIncidentType)) {
      return NextResponse.json({ error: "Tipo de incidente invalido." }, { status: 400 });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "Punto invalido." }, { status: 400 });
    }

    if (!visitorId) {
      return NextResponse.json({ error: "Falta identificador anonimo." }, { status: 400 });
    }

    const description = normalizeDescription(body.description);
    const durationMinutes = normalizeDurationMinutes(
      body.durationMinutes,
      incidentType as TrafficIncidentType
    );
    const latitudeBucket = normalizeCoordinateBucket(latitude);
    const longitudeBucket = normalizeCoordinateBucket(longitude);
    const ipAddress = getIpAddress(request);
    const reviewerKey = buildReviewerKey({
      ipAddress,
      latitudeBucket,
      longitudeBucket,
      visitorId,
    });

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("traffic_incidents")
      .insert({
        incident_type: incidentType,
        description,
        latitude,
        longitude,
        duration_minutes: durationMinutes,
        expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
        reporter_key: reviewerKey,
        visitor_id: visitorId,
        ip_address: ipAddress,
        user_agent: request.headers.get("user-agent"),
      })
      .select("*")
      .single();

    if (
      isMissingTableError(error, "traffic_incidents") ||
      isMissingTableError(error, "traffic_incident_confirmations")
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
        },
        { status: 400 }
      );
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "No se pudo registrar el incidente." },
        { status: 400 }
      );
    }

    const { error: confirmationError } = await supabase.from("traffic_incident_confirmations").upsert(
      {
        incident_id: data.id,
        reviewer_key: reviewerKey,
        visitor_id: visitorId,
        ip_address: ipAddress,
        latitude_bucket: latitudeBucket,
        longitude_bucket: longitudeBucket,
        user_agent: request.headers.get("user-agent"),
      },
      {
        onConflict: "incident_id,reviewer_key",
      }
    );

    if (
      isMissingTableError(confirmationError, "traffic_incident_confirmations") ||
      isMissingTableError(confirmationError, "traffic_incidents")
    ) {
      return NextResponse.json(
        {
          error:
            "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
        },
        { status: 400 }
      );
    }

    if (confirmationError) {
      return NextResponse.json({ error: confirmationError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("traffic_incidents")
      .update({ confirmation_count: 1, rejection_count: 0 })
      .eq("id", data.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const incident: TrafficIncident = {
      ...(data as TrafficIncident),
      confirmation_count: 1,
      duration_minutes: durationMinutes,
      rejection_count: 0,
    };

    const { error: analyticsError } = await supabase.from("app_events").insert({
      event_type: "submit_traffic_incident",
      target_id: incident.id,
      target_name: null,
      target_type: "traffic_incident",
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId || null,
      metadata: {
        duration_minutes: durationMinutes,
        incident_type: incidentType,
      },
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("traffic incident tracking failed", analyticsError.message);
    }

    return NextResponse.json({ incident });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo registrar el incidente vial.",
      },
      { status: 500 }
    );
  }
}
