import { NextRequest, NextResponse } from "next/server";
import { registerCommunityContribution } from "@/lib/contributor-rewards";
import { getSupabaseClient } from "@/lib/supabase";
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

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Faltan variables de Supabase." }, { status: 500 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      station_id: Number(body.station_id),
      fuel_type: body.fuel_type,
      availability_status: body.availability_status,
      queue_status: body.queue_status,
      comment: body.comment ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    const adminSupabase = getAdminSupabase();
    const ipAddress = getIpAddress(request);
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.trim() || null : null;
    const latitudeBucket = normalizeCoordinateBucket(body.latitude);
    const longitudeBucket = normalizeCoordinateBucket(body.longitude);

    const { error: analyticsError } = await adminSupabase.from("app_events").insert({
      event_type: "submit_report",
      target_id: Number(body.station_id),
      target_name: null,
      target_type: "station",
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      visitor_id: visitorId,
      metadata: {
        availability_status: body.availability_status,
        fuel_type: body.fuel_type,
        queue_status: body.queue_status,
      },
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("analytics report tracking failed", analyticsError.message);
    }

    try {
      await registerCommunityContribution({
        contributorToken:
          typeof body.contributorToken === "string" ? body.contributorToken : null,
        duplicateSignature: [
          "fuel",
          Number(body.station_id),
          body.fuel_type,
          body.availability_status,
          body.queue_status,
        ].join(":"),
        ipAddress,
        latitudeBucket,
        longitudeBucket,
        metadata: {
          availability_status: body.availability_status,
          fuel_type: body.fuel_type,
          queue_status: body.queue_status,
          station_id: Number(body.station_id),
        },
        sourceId: Number(data?.id),
        sourceType: "fuel_report",
        visitorId,
      });
    } catch (rewardError) {
      console.error(
        "fuel report contribution tracking failed",
        rewardError instanceof Error ? rewardError.message : rewardError
      );
    }
  } catch {
    // Keep report submission resilient even if analytics is unavailable.
  }

  return NextResponse.json({ report: data });
}
