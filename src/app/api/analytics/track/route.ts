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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventType = String(body.eventType ?? "").trim();
    const targetType = String(body.targetType ?? "").trim();

    if (!eventType || !targetType) {
      return NextResponse.json({ error: "Evento incompleto." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase.from("app_events").insert({
      event_type: eventType,
      ip_address: getIpAddress(request),
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      path: typeof body.path === "string" ? body.path : request.nextUrl.pathname,
      referrer: request.headers.get("referer"),
      target_id:
        typeof body.targetId === "number" && Number.isFinite(body.targetId)
          ? body.targetId
          : null,
      target_name:
        typeof body.targetName === "string" ? body.targetName.trim() || null : null,
      target_type: targetType,
      user_agent: request.headers.get("user-agent"),
      visitor_id:
        typeof body.visitorId === "string" ? body.visitorId.trim() || null : null,
    });

    if (error && !isMissingTableError(error, "app_events")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar el evento." },
      { status: 500 }
    );
  }
}
