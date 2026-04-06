import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import type { ServiceAdminRow } from "@/lib/admin-service-types";
import { normalizeServiceAdminInput } from "@/lib/admin-services";
import type { OSMImportApplyItem } from "@/lib/admin-osm-types";
import {
  STATION_ADMIN_SELECT,
  STATION_BASE_SELECT,
  stripStationOptionalFields,
  withStationOptionalDefaults,
} from "@/lib/admin-stations-compat";
import { normalizeStationAdminInput } from "@/lib/admin-stations";
import type { StationAdminRow } from "@/lib/admin-types";
import {
  stripSupportServiceOptionalFields,
  SUPPORT_SERVICE_BASE_SELECT,
  SUPPORT_SERVICE_SELECT,
  withSupportServiceDefaults,
} from "@/lib/support-services-compat";
import {
  getMissingSupportServicesMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

type MutationResultRow = {
  id: number;
  name: string;
};

function mergeText(...values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result.join(" | ") || undefined;
}

function coordinatesChanged(
  previousLatitude: number | null,
  previousLongitude: number | null,
  nextLatitude: number | null | undefined,
  nextLongitude: number | null | undefined
) {
  if (
    previousLatitude == null ||
    previousLongitude == null ||
    nextLatitude == null ||
    nextLongitude == null
  ) {
    return false;
  }

  return (
    Math.abs(previousLatitude - nextLatitude) > 0.000001 ||
    Math.abs(previousLongitude - nextLongitude) > 0.000001
  );
}

function hasMutationResult(data: MutationResultRow | null): data is MutationResultRow {
  return data != null;
}

async function getStationMap(ids: number[]) {
  const supabase = getAdminSupabase();
  const initialResult = await supabase
    .from("stations")
    .select(STATION_ADMIN_SELECT)
    .in("id", ids);

  if (!isMissingColumnError(initialResult.error, "stations", ["reputation_score", "reputation_votes"])) {
    return {
      data: new Map(
        (((initialResult.data ?? []) as unknown as StationAdminRow[]) ?? []).map((station) => [
          station.id,
          station,
        ])
      ),
      error: initialResult.error,
    };
  }

  const legacyResult = await supabase
    .from("stations")
    .select(STATION_BASE_SELECT)
    .in("id", ids);

  return {
    data: new Map(
      (legacyResult.data ?? [])
        .map((station) => withStationOptionalDefaults(station as Partial<StationAdminRow>))
        .map((station) => [station.id, station] as const)
    ),
    error: legacyResult.error,
  };
}

async function getServiceMap(ids: number[]) {
  const supabase = getAdminSupabase();
  const initialResult = await supabase
    .from("support_services")
    .select(SUPPORT_SERVICE_SELECT)
    .in("id", ids);

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
      data: new Map(
        (((initialResult.data ?? []) as unknown as ServiceAdminRow[]) ?? []).map((service) => [
          service.id,
          service,
        ])
      ),
      error: initialResult.error,
    };
  }

  const legacyResult = await supabase
    .from("support_services")
    .select(SUPPORT_SERVICE_BASE_SELECT)
    .in("id", ids);

  return {
    data: new Map(
      (legacyResult.data ?? [])
        .map((service) => withSupportServiceDefaults(service as Partial<ServiceAdminRow>))
        .map((service) => [service.id, service] as const)
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
    const body = await request.json();
    const items = (Array.isArray(body.items) ? body.items : []) as OSMImportApplyItem[];

    if (items.length === 0) {
      return NextResponse.json({ error: "No hay elementos para aplicar." }, { status: 400 });
    }

    const actionableItems = items.filter(
      (item) => item.action === "create" || item.action === "update"
    );

    if (actionableItems.length === 0) {
      return NextResponse.json({ error: "No hay acciones create/update seleccionadas." }, { status: 400 });
    }

    const stationUpdateIds = actionableItems
      .filter((item) => item.target === "stations" && item.action === "update" && item.matchId != null)
      .map((item) => item.matchId as number);
    const serviceUpdateIds = actionableItems
      .filter((item) => item.target === "services" && item.action === "update" && item.matchId != null)
      .map((item) => item.matchId as number);

    const needStationMap = stationUpdateIds.length > 0;
    const needServiceMap = serviceUpdateIds.length > 0;

    const [{ data: stationMap, error: stationMapError }, { data: serviceMap, error: serviceMapError }] =
      await Promise.all([
        needStationMap
          ? getStationMap(stationUpdateIds)
          : Promise.resolve({ data: new Map<number, StationAdminRow>(), error: null }),
        needServiceMap
          ? getServiceMap(serviceUpdateIds)
          : Promise.resolve({ data: new Map<number, ServiceAdminRow>(), error: null }),
      ]);

    if (stationMapError) {
      return NextResponse.json({ error: stationMapError.message }, { status: 400 });
    }

    if (isMissingTableError(serviceMapError, "support_services")) {
      return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
    }

    if (serviceMapError) {
      return NextResponse.json({ error: serviceMapError.message }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const created: Array<{ id: number; name: string; target: "stations" | "services" }> = [];
    const updated: Array<{ id: number; name: string; target: "stations" | "services" }> = [];

    for (const item of actionableItems) {
      if (item.target === "stations") {
        const incoming = item.stationPayload;
        if (!incoming) {
          return NextResponse.json({ error: "Falta payload de estación." }, { status: 400 });
        }

        if (item.action === "create") {
          const payload = {
            ...normalizeStationAdminInput({
              ...incoming,
              is_active: true,
              is_verified: false,
            }),
            updated_at: new Date().toISOString(),
          };

          let { data, error } = await supabase
            .from("stations")
            .insert(payload)
            .select("id,name")
            .single();

          if (isMissingColumnError(error, "stations", ["reputation_score", "reputation_votes"])) {
            const legacyResult = await supabase
              .from("stations")
              .insert(stripStationOptionalFields(payload))
              .select("id,name")
              .single();

            data = legacyResult.data;
            error = legacyResult.error;
          }

          if (error) {
            return NextResponse.json(
              { error: `Error creando estación "${incoming.name}": ${error.message}` },
              { status: 400 }
            );
          }

          if (!hasMutationResult(data)) {
            return NextResponse.json(
              { error: `La creación de estación "${incoming.name}" no devolvió un registro.` },
              { status: 500 }
            );
          }

          created.push({ id: data.id, name: data.name, target: "stations" });
          continue;
        }

        const existing = item.matchId != null ? stationMap.get(item.matchId) : null;
        if (!existing) {
          return NextResponse.json(
            { error: `No se encontró la estación a actualizar (${item.matchId ?? "sin id"}).` },
            { status: 400 }
          );
        }

        const payload = {
          ...normalizeStationAdminInput({
            name: incoming.name || existing.name,
            zone: incoming.zone || existing.zone || undefined,
            city: incoming.city || existing.city || undefined,
            address: incoming.address || existing.address || undefined,
            latitude: incoming.latitude ?? existing.latitude,
            longitude: incoming.longitude ?? existing.longitude,
            fuel_especial: incoming.fuel_especial ?? existing.fuel_especial,
            fuel_premium: incoming.fuel_premium ?? existing.fuel_premium,
            fuel_diesel: incoming.fuel_diesel ?? existing.fuel_diesel,
            fuel_gnv: incoming.fuel_gnv ?? existing.fuel_gnv,
            is_active: existing.is_active,
            is_verified: coordinatesChanged(
              existing.latitude,
              existing.longitude,
              incoming.latitude,
              incoming.longitude
            )
              ? false
              : existing.is_verified,
            source_url: incoming.source_url || existing.source_url || undefined,
            notes: mergeText(existing.notes, incoming.notes),
            license_code: existing.license_code || undefined,
            reputation_score: existing.reputation_score ?? 0,
            reputation_votes: existing.reputation_votes ?? 0,
          }),
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await supabase
          .from("stations")
          .update(payload)
          .eq("id", existing.id)
          .select("id,name")
          .single();

        if (isMissingColumnError(error, "stations", ["reputation_score", "reputation_votes"])) {
          const legacyResult = await supabase
            .from("stations")
            .update(stripStationOptionalFields(payload))
            .eq("id", existing.id)
            .select("id,name")
            .single();

          data = legacyResult.data;
          error = legacyResult.error;
        }

        if (error) {
          return NextResponse.json(
            { error: `Error actualizando estación "${incoming.name}": ${error.message}` },
            { status: 400 }
          );
        }

        if (!hasMutationResult(data)) {
          return NextResponse.json(
            { error: `La actualización de estación "${incoming.name}" no devolvió un registro.` },
            { status: 500 }
          );
        }

        updated.push({ id: data.id, name: data.name, target: "stations" });
        continue;
      }

      const incoming = item.servicePayload;
      if (!incoming) {
        return NextResponse.json({ error: "Falta payload de servicio." }, { status: 400 });
      }

      if (item.action === "create") {
        const payload = {
          ...normalizeServiceAdminInput({
            ...incoming,
            is_active: true,
            is_published: false,
            is_verified: false,
            rating_count: 0,
            rating_score: 0,
          }),
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await supabase
          .from("support_services")
          .insert(payload)
          .select("id,name")
          .single();

        if (isMissingColumnError(error, "support_services", ["price_text", "meeting_point", "rating_score", "rating_count", "is_published"])) {
          const legacyResult = await supabase
            .from("support_services")
            .insert(stripSupportServiceOptionalFields(payload))
            .select("id,name")
            .single();

          data = legacyResult.data;
          error = legacyResult.error;
        }

        if (isMissingTableError(error, "support_services")) {
          return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
        }

        if (error) {
          return NextResponse.json(
            { error: `Error creando servicio "${incoming.name}": ${error.message}` },
            { status: 400 }
          );
        }

        if (!hasMutationResult(data)) {
          return NextResponse.json(
            { error: `La creación de servicio "${incoming.name}" no devolvió un registro.` },
            { status: 500 }
          );
        }

        created.push({ id: data.id, name: data.name, target: "services" });
        continue;
      }

      const existing = item.matchId != null ? serviceMap.get(item.matchId) : null;
      if (!existing) {
        return NextResponse.json(
          { error: `No se encontró el servicio a actualizar (${item.matchId ?? "sin id"}).` },
          { status: 400 }
        );
      }

      const payload = {
        ...normalizeServiceAdminInput({
          name: incoming.name || existing.name,
          category: incoming.category || existing.category,
          zone: incoming.zone || existing.zone || undefined,
          city: incoming.city || existing.city || undefined,
          address: incoming.address || existing.address || undefined,
          latitude: incoming.latitude ?? existing.latitude,
          longitude: incoming.longitude ?? existing.longitude,
          phone: incoming.phone || existing.phone || undefined,
          whatsapp_number:
            incoming.whatsapp_number || existing.whatsapp_number || incoming.phone || undefined,
          website_url: incoming.website_url || existing.website_url || undefined,
          description: mergeText(existing.description, incoming.description),
          price_text: incoming.price_text || existing.price_text || undefined,
          meeting_point: incoming.meeting_point || existing.meeting_point || undefined,
          rating_score: existing.rating_score ?? 0,
          rating_count: existing.rating_count ?? 0,
          is_active: existing.is_active,
          is_published: existing.is_published,
          is_verified: coordinatesChanged(
            existing.latitude,
            existing.longitude,
            incoming.latitude,
            incoming.longitude
          )
            ? false
            : existing.is_verified,
          source_url: incoming.source_url || existing.source_url || undefined,
          notes: mergeText(existing.notes, incoming.notes),
        }),
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from("support_services")
        .update(payload)
        .eq("id", existing.id)
        .select("id,name")
        .single();

      if (isMissingColumnError(error, "support_services", ["price_text", "meeting_point", "rating_score", "rating_count", "is_published"])) {
        const legacyResult = await supabase
          .from("support_services")
          .update(stripSupportServiceOptionalFields(payload))
          .eq("id", existing.id)
          .select("id,name")
          .single();

        data = legacyResult.data;
        error = legacyResult.error;
      }

      if (isMissingTableError(error, "support_services")) {
        return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
      }

      if (error) {
        return NextResponse.json(
          { error: `Error actualizando servicio "${incoming.name}": ${error.message}` },
          { status: 400 }
        );
      }

      if (!hasMutationResult(data)) {
        return NextResponse.json(
          { error: `La actualización de servicio "${incoming.name}" no devolvió un registro.` },
          { status: 500 }
        );
      }

      updated.push({ id: data.id, name: data.name, target: "services" });
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo aplicar el lote de OpenStreetMap.",
      },
      { status: 500 }
    );
  }
}
