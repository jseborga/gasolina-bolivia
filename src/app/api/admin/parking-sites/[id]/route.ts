import { NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { normalizeParkingSiteAdminInput } from "@/lib/admin-parkings";
import type { ParkingSiteAdminInput } from "@/lib/admin-parking-types";
import { getMissingParkingSitesMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesion en el admin." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parkingSiteId = Number(id);
    if (!Number.isFinite(parkingSiteId)) {
      return NextResponse.json({ error: "ID de parqueo invalido." }, { status: 400 });
    }

    const body = (await request.json()) as ParkingSiteAdminInput;
    const now = new Date().toISOString();
    const payload = {
      ...normalizeParkingSiteAdminInput(body),
      last_update_source: "admin",
      last_updated_at: now,
      updated_at: now,
    };

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("parking_sites")
      .update(payload)
      .eq("id", parkingSiteId)
      .select("*")
      .single();

    if (isMissingTableError(error, "parking_sites")) {
      return NextResponse.json({ error: getMissingParkingSitesMessage() }, { status: 400 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, parkingSite: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesion en el admin." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parkingSiteId = Number(id);
    if (!Number.isFinite(parkingSiteId)) {
      return NextResponse.json({ error: "ID de parqueo invalido." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase.from("parking_sites").delete().eq("id", parkingSiteId);

    if (isMissingTableError(error, "parking_sites")) {
      return NextResponse.json({ error: getMissingParkingSitesMessage() }, { status: 400 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deletedId: parkingSiteId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
