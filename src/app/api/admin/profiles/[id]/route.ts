import { NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { normalizeAppProfileAdminInput } from "@/lib/admin-parkings";
import type { AppProfileAdminInput } from "@/lib/admin-parking-types";
import { getMissingAppProfilesMessage, isMissingTableError } from "@/lib/supabase-errors";
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
    const profileId = Number(id);
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "ID de perfil invalido." }, { status: 400 });
    }

    const body = (await request.json()) as AppProfileAdminInput;
    const supabase = getAdminSupabase();
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("app_profiles")
      .select("manager_access_token")
      .eq("id", profileId)
      .single();

    if (isMissingTableError(currentProfileError, "app_profiles")) {
      return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
    }

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: currentProfileError?.message || "Perfil no encontrado." },
        { status: 404 }
      );
    }

    const payload = {
      ...normalizeAppProfileAdminInput(body, currentProfile.manager_access_token),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("app_profiles")
      .update(payload)
      .eq("id", profileId)
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
    const profileId = Number(id);
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "ID de perfil invalido." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase.from("app_profiles").delete().eq("id", profileId);

    if (isMissingTableError(error, "app_profiles")) {
      return NextResponse.json({ error: getMissingAppProfilesMessage() }, { status: 400 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deletedId: profileId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
