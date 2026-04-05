import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow } from '@/lib/admin-types';
import { buildStationImportPreview } from '@/lib/admin-import';
import { getAdminSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = String(body.input ?? '').trim();

    if (!input) {
      return NextResponse.json({ error: 'Pega una o varias entradas para analizar.' }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('stations')
      .select('id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const preview = await buildStationImportPreview(input, (data ?? []) as StationAdminRow[]);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar la vista previa.' },
      { status: 500 }
    );
  }
}
