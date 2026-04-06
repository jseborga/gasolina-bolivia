import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import {
  buildOSMImportPreview,
} from "@/lib/admin-osm-import";
import type { OSMImportRequest } from "@/lib/admin-osm-types";
import {
  STATION_ADMIN_SELECT,
  STATION_BASE_SELECT,
  withStationOptionalDefaults,
} from "@/lib/admin-stations-compat";
import type { StationAdminRow } from "@/lib/admin-types";
import type { ServiceAdminRow } from "@/lib/admin-service-types";
import {
  SUPPORT_SERVICE_BASE_SELECT,
  SUPPORT_SERVICE_SELECT,
  withSupportServiceDefaults,
} from "@/lib/support-services-compat";
import { getAdminSupabase } from "@/lib/supabase-server";
import { isMissingColumnError } from "@/lib/supabase-errors";

async function getStations() {
  const supabase = getAdminSupabase();
  const initialResult = await supabase
    .from("stations")
    .select(STATION_ADMIN_SELECT)
    .order("name", { ascending: true });

  if (!isMissingColumnError(initialResult.error, "stations", ["reputation_score", "reputation_votes"])) {
    return {
      data: (initialResult.data ?? []) as unknown as StationAdminRow[],
      error: initialResult.error,
    };
  }

  const legacyResult = await supabase
    .from("stations")
    .select(STATION_BASE_SELECT)
    .order("name", { ascending: true });

  return {
    data: (legacyResult.data ?? []).map((station) =>
      withStationOptionalDefaults(station as Partial<StationAdminRow>)
    ),
    error: legacyResult.error,
  };
}

async function getServices() {
  const supabase = getAdminSupabase();
  const initialResult = await supabase
    .from("support_services")
    .select(SUPPORT_SERVICE_SELECT)
    .order("name", { ascending: true });

  if (
    !isMissingColumnError(initialResult.error, "support_services", [
      "price_text",
      "meeting_point",
      "rating_score",
      "rating_count",
      "is_published",
    ])
  ) {
    return {
      data: (initialResult.data ?? []) as unknown as ServiceAdminRow[],
      error: initialResult.error,
    };
  }

  const legacyResult = await supabase
    .from("support_services")
    .select(SUPPORT_SERVICE_BASE_SELECT)
    .order("name", { ascending: true });

  return {
    data: (legacyResult.data ?? []).map((service) =>
      withSupportServiceDefaults(service as Partial<ServiceAdminRow>)
    ),
    error: legacyResult.error,
  };
}

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesión en el admin." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as OSMImportRequest;
    const department = String(body.department ?? "").trim();
    const country = String(body.country ?? "Bolivia").trim() || "Bolivia";
    const target = body.target;

    if (!department) {
      return NextResponse.json({ error: "Debes indicar un departamento o área." }, { status: 400 });
    }

    if (target !== "stations" && target !== "services") {
      return NextResponse.json({ error: "El tipo de importación no es válido." }, { status: 400 });
    }

    if (target === "services" && !body.serviceCategory) {
      return NextResponse.json({ error: "Debes elegir una categoría de servicio." }, { status: 400 });
    }

    const [{ data: stations, error: stationsError }, { data: services, error: servicesError }] =
      await Promise.all([
        getStations(),
        target === "services"
          ? getServices()
          : Promise.resolve({ data: [] as ServiceAdminRow[], error: null }),
      ]);

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 400 });
    }

    if (servicesError) {
      return NextResponse.json({ error: servicesError.message }, { status: 400 });
    }

    const preview = await buildOSMImportPreview(
      {
        country,
        department,
        serviceCategory: body.serviceCategory,
        target,
      },
      stations,
      services
    );

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar la vista previa desde OpenStreetMap.",
      },
      { status: 500 }
    );
  }
}
