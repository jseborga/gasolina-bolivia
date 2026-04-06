import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { PlaceReportReason } from "@/lib/types";

const VALID_REASONS: PlaceReportReason[] = [
  "not_exists",
  "wrong_location",
  "duplicate",
  "closed",
  "other",
];

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

function normalizeNotes(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.slice(0, 240);
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
    const targetType = body.targetType === "service" ? "service" : "station";
    const targetId = Number(body.targetId);
    const targetName =
      typeof body.targetName === "string" ? body.targetName.trim().slice(0, 140) : null;
    const reason = typeof body.reason === "string" ? body.reason : "not_exists";
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!Number.isFinite(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Elemento invalido." }, { status: 400 });
    }

    if (!VALID_REASONS.includes(reason as PlaceReportReason)) {
      return NextResponse.json({ error: "Motivo invalido." }, { status: 400 });
    }

    if (!visitorId) {
      return NextResponse.json({ error: "Falta identificador anonimo." }, { status: 400 });
    }

    const notes = normalizeNotes(body.notes);
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
    const { error } = await supabase.from("place_reports").upsert(
      {
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        reason,
        notes,
        reviewer_key: reviewerKey,
        visitor_id: visitorId,
        ip_address: ipAddress,
        latitude_bucket: latitudeBucket,
        longitude_bucket: longitudeBucket,
        user_agent: request.headers.get("user-agent"),
      },
      {
        onConflict: "target_type,target_id,reason,reviewer_key",
      }
    );

    if (isMissingTableError(error, "place_reports")) {
      return NextResponse.json(
        { error: "Falta la tabla place_reports. Ejecuta la migracion 008_place_reports.sql." },
        { status: 400 }
      );
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { error: analyticsError } = await supabase.from("app_events").insert({
      event_type: "submit_place_report",
      target_id: targetId,
      target_name: targetName,
      target_type: targetType,
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId || null,
      metadata: {
        notes_length: notes?.length ?? 0,
        reason,
      },
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("place report tracking failed", analyticsError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la denuncia." },
      { status: 500 }
    );
  }
}
