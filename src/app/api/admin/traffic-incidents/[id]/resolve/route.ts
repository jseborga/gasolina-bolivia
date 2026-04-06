import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const incidentId = Number(id);

    if (!Number.isFinite(incidentId) || incidentId <= 0) {
      return NextResponse.json({ error: "Incidente invalido." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("traffic_incidents")
      .update({
        resolved_at: new Date().toISOString(),
        status: "resolved",
      })
      .eq("id", incidentId)
      .select("*")
      .single();

    if (isMissingTableError(error, "traffic_incidents")) {
      return NextResponse.json(
        {
          error:
            "Faltan las tablas de incidentes. Ejecuta la migracion supabase/009_traffic_incidents.sql.",
        },
        { status: 400 }
      );
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "No se pudo cerrar el incidente." },
        { status: 400 }
      );
    }

    return NextResponse.json({ incident: data, ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo cerrar el incidente vial.",
      },
      { status: 500 }
    );
  }
}
