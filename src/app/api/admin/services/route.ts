import { NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { normalizeServiceAdminInput } from '@/lib/admin-services';
import type { ServiceAdminInput } from '@/lib/admin-service-types';
import { getAdminSupabase } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión en el admin.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ServiceAdminInput;
    const supabase = getAdminSupabase();
    const payload = {
      ...normalizeServiceAdminInput(body),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('support_services').insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, service: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
