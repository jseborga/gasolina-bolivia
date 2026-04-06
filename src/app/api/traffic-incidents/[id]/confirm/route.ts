import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incidentId = Number(id);
    const body = await request.json().catch(() => ({}));
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!Number.isFinite(incidentId) || incidentId <= 0) {
      return NextResponse.json({ error: "Incidente invalido." }, { status: 400 });
    }

    if (!visitorId) {
      return NextResponse.json({ error: "Falta identificador anonimo." }, { status: 400 });
    }

    const latitudeBucket = normalizeCoordinateBucket(body.latitude);
    const longitudeBucket = normalizeCoordinateBucket(body.longitude);
    const ipAddress = getIpAddress(request);
    const reviewerKey = buildReviewerKey({
      ipAddress,
      latitudeBucket,
      longitudeBucket,
      visitorId,
    });

    const supabase = getAdminSupabase();

    const { data: incident, error: incidentError } = await supabase
      .from("traffic_incidents")
      .select("id, status, expires_at, confirmation_count")
      .eq("id", incidentId)
      .maybeSingle();

    if (isMissingTableError(incidentError, "traffic_incidents")) {
      return NextResponse.json(
        {
          error:
            "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
        },
        { status: 400 }
      );
    }

    if (incidentError) {
      return NextResponse.json({ error: incidentError.message }, { status: 400 });
    }

    if (!incident) {
      return NextResponse.json({ error: "Incidente no encontrado." }, { status: 404 });
    }

    if (incident.status !== "active" || new Date(incident.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Este incidente ya no esta activo." }, { status: 400 });
    }

    const { data: existingConfirmation, error: existingError } = await supabase
      .from("traffic_incident_confirmations")
      .select("id")
      .eq("incident_id", incidentId)
      .eq("reviewer_key", reviewerKey)
      .maybeSingle();

    if (isMissingTableError(existingError, "traffic_incident_confirmations")) {
      return NextResponse.json(
        {
          error:
            "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
        },
        { status: 400 }
      );
    }

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    if (!existingConfirmation) {
      const { error: insertError } = await supabase.from("traffic_incident_confirmations").insert({
        incident_id: incidentId,
        reviewer_key: reviewerKey,
        visitor_id: visitorId,
        ip_address: ipAddress,
        latitude_bucket: latitudeBucket,
        longitude_bucket: longitudeBucket,
        user_agent: request.headers.get("user-agent"),
      });

      if (isMissingTableError(insertError, "traffic_incident_confirmations")) {
        return NextResponse.json(
          {
            error:
              "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
          },
          { status: 400 }
        );
      }

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    const { count, error: countError } = await supabase
      .from("traffic_incident_confirmations")
      .select("id", { count: "exact", head: true })
      .eq("incident_id", incidentId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    const confirmationCount = count ?? incident.confirmation_count ?? 0;

    const { error: updateError } = await supabase
      .from("traffic_incidents")
      .update({ confirmation_count: confirmationCount })
      .eq("id", incidentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { error: analyticsError } = await supabase.from("app_events").insert({
      event_type: "confirm_traffic_incident",
      target_id: incidentId,
      target_name: null,
      target_type: "traffic_incident",
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId || null,
      metadata: {
        already_confirmed: Boolean(existingConfirmation),
      },
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("traffic incident confirmation tracking failed", analyticsError.message);
    }

    return NextResponse.json({
      alreadyConfirmed: Boolean(existingConfirmation),
      confirmationCount,
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo confirmar el incidente vial.",
      },
      { status: 500 }
    );
  }
}
