import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

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
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");

    const { error: analyticsError } = await adminSupabase.from("app_events").insert({
      event_type: "submit_report",
      target_id: Number(body.station_id),
      target_name: null,
      target_type: "station",
      path: request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
      visitor_id:
        typeof body.visitorId === "string" ? body.visitorId.trim() || null : null,
      metadata: {
        availability_status: body.availability_status,
        fuel_type: body.fuel_type,
        queue_status: body.queue_status,
      },
    });

    if (analyticsError && !isMissingTableError(analyticsError, "app_events")) {
      console.error("analytics report tracking failed", analyticsError.message);
    }
  } catch {
    // Keep report submission resilient even if analytics is unavailable.
  }

  return NextResponse.json({ report: data });
}
