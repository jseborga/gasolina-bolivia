import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { StationAdminInput } from '@/lib/admin-types';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as StationAdminInput;
    const supabase = getServerSupabase();

    const payload = {
      name: body.name,
      zone: body.zone ?? null,
      city: body.city ?? null,
      address: body.address ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      fuel_especial: body.fuel_especial ?? false,
      fuel_premium: body.fuel_premium ?? false,
      fuel_diesel: body.fuel_diesel ?? false,
      fuel_gnv: body.fuel_gnv ?? false,
      is_active: body.is_active ?? true,
      is_verified: body.is_verified ?? false,
      source_url: body.source_url ?? null,
      notes: body.notes ?? null,
      license_code: body.license_code ?? null,
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
