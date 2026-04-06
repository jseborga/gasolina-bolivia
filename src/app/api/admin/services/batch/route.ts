import { NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import {
  getMissingSupportServicesMessage,
  isMissingTableError,
} from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

type ServiceBatchAction =
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'verify'
  | 'unverify';

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
      action?: ServiceBatchAction;
      ids?: unknown;
    };
    const ids = parseIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un servicio.' },
        { status: 400 }
      );
    }

    const action = body.action;
    if (!action || !['delete', 'publish', 'unpublish', 'verify', 'unverify'].includes(action)) {
      return NextResponse.json({ error: 'Accion masiva invalida.' }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    if (action === 'delete') {
      const { error } = await supabase.from('support_services').delete().in('id', ids);

      if (isMissingTableError(error, 'support_services')) {
        return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ action, affected: ids.length, ok: true });
    }

    const payload =
      action === 'publish' || action === 'unpublish'
        ? {
            is_published: action === 'publish',
            updated_at: new Date().toISOString(),
          }
        : {
            is_verified: action === 'verify',
            updated_at: new Date().toISOString(),
          };

    const { error } = await supabase
      .from('support_services')
      .update(payload)
      .in('id', ids);

    if (isMissingTableError(error, 'support_services')) {
      return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
    }

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
