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
    const stationId = Number(body.stationId);
    const score = Number(body.score);
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.trim() : "";

    if (!Number.isFinite(stationId) || stationId <= 0) {
      return NextResponse.json({ error: "Estacion invalida." }, { status: 400 });
    }

    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "La puntuacion debe estar entre 1 y 5." },
        { status: 400 }
      );
    }

    if (!visitorId) {
      return NextResponse.json(
        { error: "Falta identificador anonimo." },
        { status: 400 }
      );
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
      station_id: stationId,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId,
    };

    const { error: reviewError } = await supabase.from("station_reviews").upsert(
      upsertPayload,
      {
        onConflict: "station_id,reviewer_key",
      }
    );

    if (isMissingTableError(reviewError, "station_reviews")) {
      return NextResponse.json(
        {
          error:
            "Falta la tabla station_reviews. Ejecuta la migracion 007_station_reviews.sql.",
        },
        { status: 400 }
      );
    }

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 400 });
    }

    const aggregateResult = await supabase
      .from("station_reviews")
      .select("score")
      .eq("station_id", stationId);

    if (isMissingTableError(aggregateResult.error, "station_reviews")) {
      return NextResponse.json(
        {
          error:
            "Falta la tabla station_reviews. Ejecuta la migracion 007_station_reviews.sql.",
        },
        { status: 400 }
      );
    }

    if (aggregateResult.error) {
      return NextResponse.json(
        { error: aggregateResult.error.message },
        { status: 400 }
      );
    }

    const rows = aggregateResult.data ?? [];
    const reputationVotes = rows.length;
    const reputationScore =
      reputationVotes > 0
        ? Number(
            (
              rows.reduce((total, row) => total + Number(row.score ?? 0), 0) /
              reputationVotes
            ).toFixed(1)
          )
        : 0;

    const updatePayload = {
      reputation_score: reputationScore,
      reputation_votes: reputationVotes,
      updated_at: new Date().toISOString(),
    };

    let updateError = (
      await supabase.from("stations").update(updatePayload).eq("id", stationId)
    ).error;

    if (
      isMissingColumnError(updateError, "stations", [
        "reputation_score",
        "reputation_votes",
      ])
    ) {
      updateError = (
        await supabase
          .from("stations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", stationId)
      ).error;
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { error: analyticsError } = await supabase.from("app_events").insert({
      event_type: "submit_station_review",
      ip_address: ipAddress,
      metadata: {
        comment_length: comment?.length ?? 0,
        score: Math.round(score),
      },
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      target_id: stationId,
      target_name: null,
      target_type: "station",
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId || null,
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("station review tracking failed", analyticsError.message);
    }

    return NextResponse.json({
      ok: true,
      reputationScore,
      reputationVotes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la calificacion.",
      },
      { status: 500 }
    );
  }
}
