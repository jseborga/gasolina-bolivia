import { NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { normalizeAppProfileAdminInput } from "@/lib/admin-parkings";
import type { AppProfileAdminInput } from "@/lib/admin-parking-types";
import { getMissingAppProfilesMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesion en el admin." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as AppProfileAdminInput;
    const payload = {
      ...normalizeAppProfileAdminInput(body),
      updated_at: new Date().toISOString(),
    };

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("app_profiles")
      .insert(payload)
      .select("*")
      .single();

    if (isMissingTableError(error, "app_profiles")) {
      return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
