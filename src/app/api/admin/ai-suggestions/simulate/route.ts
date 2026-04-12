import { NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { buildStationDemoSuggestions } from "@/lib/agent-suggestion-simulator";
import { getMissingAgentSuggestionsMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";
import type { Station } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { count?: number };
    const requestedCount = Number(body.count);
    const count =
      Number.isFinite(requestedCount) && requestedCount > 0
        ? Math.min(8, Math.max(1, Math.round(requestedCount)))
        : 4;

    const supabase = getAdminSupabase();
    const { data: stationsData, error: stationsError } = await supabase
      .from("stations")
      .select(
        "id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active"
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 400 });
    }

    const stations = (stationsData ?? []) as Station[];
    const suggestions = buildStationDemoSuggestions(stations, count);

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "No hay estaciones activas con coordenadas para simular sugerencias." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("agent_report_suggestions")
      .insert(suggestions)
      .select("id,title,status");

    if (isMissingTableError(error, "agent_report_suggestions")) {
      return NextResponse.json({ error: getMissingAgentSuggestionsMessage() }, { status: 400 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      count: data?.length ?? suggestions.length,
      ok: true,
      suggestions: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron generar sugerencias demo." },
      { status: 500 }
    );
  }
}
