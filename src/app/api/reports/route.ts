import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Faltan variables de Supabase." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const station_id = Number(body.station_id);
    const fuel_type = body.fuel_type;
    const availability_status = body.availability_status;
    const queue_status = body.queue_status;
    const comment = typeof body.comment === "string" ? body.comment.trim() : null;

    if (!station_id || !fuel_type || !availability_status || !queue_status) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("reports").insert({
      station_id,
      fuel_type,
      availability_status,
      queue_status,
      comment: comment || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar el reporte." },
      { status: 500 }
    );
  }
}
