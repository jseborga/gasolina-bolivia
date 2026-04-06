import { NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-server';

type StationBatchAction = 'delete' | 'verify' | 'unverify';

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  );
}

export async function POST(request: Request) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesion en el admin.' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: StationBatchAction;
      ids?: unknown;
    };
    const ids = parseIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos una estacion.' },
        { status: 400 }
      );
    }

    const action = body.action;
    if (!action || !['delete', 'verify', 'unverify'].includes(action)) {
      return NextResponse.json({ error: 'Accion masiva invalida.' }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    if (action === 'delete') {
      const { error } = await supabase.from('stations').delete().in('id', ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ action, affected: ids.length, ok: true });
    }

    const { error } = await supabase
      .from('stations')
      .update({
        is_verified: action === 'verify',
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ action, affected: ids.length, ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
