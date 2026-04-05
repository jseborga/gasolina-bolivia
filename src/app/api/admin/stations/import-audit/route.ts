import { NextRequest, NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow } from '@/lib/admin-types';
import { auditImportedStations } from '@/lib/map-verify';
import { getAdminSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesion en el admin.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 20) || 20, 1), 50);

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('stations')
      .select('id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const audit = await auditImportedStations((data ?? []) as StationAdminRow[], limit);
    return NextResponse.json(audit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo auditar el lote importado.' },
      { status: 500 }
    );
  }
}
