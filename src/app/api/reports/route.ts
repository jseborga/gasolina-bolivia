import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

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

  return NextResponse.json({ report: data });
}
