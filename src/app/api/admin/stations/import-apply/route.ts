import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow, StationImportApplyItem } from '@/lib/admin-types';
import { normalizeStationAdminInput } from '@/lib/admin-stations';
import { getAdminSupabase } from '@/lib/supabase-server';

function normalizeImportName(item: StationImportApplyItem) {
  return item.incomingName.trim() || item.incomingAddress.trim() || item.raw.trim();
}

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items = (Array.isArray(body.items) ? body.items : []) as StationImportApplyItem[];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No hay elementos para aplicar.' }, { status: 400 });
    }

    const actionableItems = items.filter((item) => item.action === 'create' || item.action === 'update');
    if (actionableItems.length === 0) {
      return NextResponse.json({ error: 'No hay acciones create/update seleccionadas.' }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const updateIds = actionableItems
      .filter((item) => item.action === 'update' && item.matchId != null)
      .map((item) => item.matchId as number);

    let existingStations = new Map<number, StationAdminRow>();
    if (updateIds.length > 0) {
      const { data, error } = await supabase
        .from('stations')
        .select('id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at')
        .in('id', updateIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      existingStations = new Map(
        ((data ?? []) as StationAdminRow[]).map((station) => [station.id, station])
      );
    }

    const created: Array<{ id: number; name: string }> = [];
    const updated: Array<{ id: number; name: string }> = [];

    for (const item of actionableItems) {
      const normalizedName = normalizeImportName(item);

      if (item.action === 'create') {
        const payload = normalizeStationAdminInput({
          name: normalizedName,
          address: item.incomingAddress || undefined,
          latitude: item.incomingLatitude,
          longitude: item.incomingLongitude,
          source_url: item.sourceUrl || undefined,
          city: 'La Paz',
          is_verified: false,
          is_active: true,
          fuel_especial: true,
          fuel_diesel: true,
          fuel_premium: false,
          fuel_gnv: false,
          notes: 'Importada desde lote de Google Maps.',
        });

        const { data, error } = await supabase
          .from('stations')
          .insert({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .select('id,name')
          .single();

        if (error) {
          return NextResponse.json({ error: `Error creando "${normalizedName}": ${error.message}` }, { status: 400 });
        }

        created.push({ id: data.id, name: data.name });
        continue;
      }

      const matchId = item.matchId;
      if (matchId == null) continue;

      const existing = existingStations.get(matchId);
      if (!existing) continue;

      const payload = normalizeStationAdminInput({
        name: normalizedName || existing.name,
        address: item.incomingAddress || existing.address || undefined,
        city: existing.city || 'La Paz',
        fuel_diesel: existing.fuel_diesel,
        fuel_especial: existing.fuel_especial,
        fuel_gnv: existing.fuel_gnv,
        fuel_premium: existing.fuel_premium,
        is_active: existing.is_active,
        is_verified:
          item.incomingLatitude != null &&
          item.incomingLongitude != null &&
          existing.latitude != null &&
          existing.longitude != null
            ? false
            : existing.is_verified,
        latitude: item.incomingLatitude ?? existing.latitude,
        longitude: item.incomingLongitude ?? existing.longitude,
        license_code: existing.license_code || undefined,
        notes: existing.notes || undefined,
        source_url: item.sourceUrl || existing.source_url || undefined,
        zone: existing.zone || undefined,
      });

      const { data, error } = await supabase
        .from('stations')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select('id,name')
        .single();

      if (error) {
        return NextResponse.json({ error: `Error actualizando "${normalizedName}": ${error.message}` }, { status: 400 });
      }

      updated.push({ id: data.id, name: data.name });
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo aplicar el lote.' },
      { status: 500 }
    );
  }
}
