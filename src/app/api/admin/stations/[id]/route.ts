import { NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { normalizeStationAdminInput } from '@/lib/admin-stations';
import type { StationAdminInput } from '@/lib/admin-types';
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

    const { data, error } = await supabase
      .from('stations')
      .update(payload)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, station: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
