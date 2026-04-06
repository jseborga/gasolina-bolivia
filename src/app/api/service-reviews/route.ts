import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

function getIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

function normalizeComment(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.slice(0, 180);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const serviceId = Number(body.serviceId);
    const score = Number(body.score);
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return NextResponse.json({ error: "Servicio invalido." }, { status: 400 });
    }

    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "La puntuacion debe estar entre 1 y 5." }, { status: 400 });
    }

    if (!visitorId) {
      return NextResponse.json({ error: "Falta identificador anonimo." }, { status: 400 });
    }

    const comment = normalizeComment(body.comment);
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
    const upsertPayload = {
      comment,
      ip_address: ipAddress,
      latitude_bucket: latitudeBucket,
      longitude_bucket: longitudeBucket,
      reviewer_key: reviewerKey,
      score: Math.round(score),
      service_id: serviceId,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId,
    };

    const { error: reviewError } = await supabase
      .from("support_service_reviews")
      .upsert(upsertPayload, {
        onConflict: "service_id,reviewer_key",
      });

    if (isMissingTableError(reviewError, "support_service_reviews")) {
      return NextResponse.json(
        { error: "Falta la tabla support_service_reviews. Ejecuta la migracion 006_support_service_reviews.sql." },
        { status: 400 }
      );
    }

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 400 });
    }

    const aggregateResult = await supabase
      .from("support_service_reviews")
      .select("score")
      .eq("service_id", serviceId);

    if (isMissingTableError(aggregateResult.error, "support_service_reviews")) {
      return NextResponse.json(
        { error: "Falta la tabla support_service_reviews. Ejecuta la migracion 006_support_service_reviews.sql." },
        { status: 400 }
      );
    }

    if (aggregateResult.error) {
      return NextResponse.json({ error: aggregateResult.error.message }, { status: 400 });
    }

    const rows = aggregateResult.data ?? [];
    const ratingCount = rows.length;
    const ratingScore =
      ratingCount > 0
        ? Number(
            (rows.reduce((total, row) => total + Number(row.score ?? 0), 0) / ratingCount).toFixed(1)
          )
        : 0;

    const updatePayload = {
      rating_count: ratingCount,
      rating_score: ratingScore,
      updated_at: new Date().toISOString(),
    };

    let updateError = (
      await supabase.from("support_services").update(updatePayload).eq("id", serviceId)
    ).error;

    if (
      isMissingColumnError(updateError, "support_services", ["rating_score", "rating_count"])
    ) {
      updateError = (
        await supabase
          .from("support_services")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", serviceId)
      ).error;
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { error: analyticsError } = await supabase.from("app_events").insert({
      event_type: "submit_service_review",
      ip_address: ipAddress,
      metadata: {
        comment_length: comment?.length ?? 0,
        score: Math.round(score),
      },
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      target_id: serviceId,
      target_name: null,
      target_type: "service",
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId || null,
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("service review tracking failed", analyticsError.message);
    }

    return NextResponse.json({
      ok: true,
      ratingCount,
      ratingScore,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la review." },
      { status: 500 }
    );
  }
}
