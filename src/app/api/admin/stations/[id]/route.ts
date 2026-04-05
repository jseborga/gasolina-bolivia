import { NextResponse } from 'next/server';
import {
  STATION_OPTIONAL_COLUMNS,
  stripStationOptionalFields,
  withStationOptionalDefaults,
} from '@/lib/admin-stations-compat';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { normalizeStationAdminInput } from '@/lib/admin-stations';
import type { StationAdminInput, StationAdminRow } from '@/lib/admin-types';
import { isMissingColumnError } from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as StationAdminInput;
    const supabase = getAdminSupabase();
    const payload = {
      ...normalizeStationAdminInput(body),
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('stations')
      .update(payload)
      .eq('id', Number(id))
      .select()
      .single();

    if (isMissingColumnError(error, 'stations', STATION_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('stations')
        .update(stripStationOptionalFields(payload))
        .eq('id', Number(id))
        .select()
        .single();

      data = legacyResult.data
        ? withStationOptionalDefaults(legacyResult.data as Partial<StationAdminRow>)
        : null;
      error = legacyResult.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, station: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
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
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const stationId = Number(id);
    if (!Number.isFinite(stationId)) {
      return NextResponse.json({ error: 'ID de estación inválido.' }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase.from('stations').delete().eq('id', stationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deletedId: stationId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
