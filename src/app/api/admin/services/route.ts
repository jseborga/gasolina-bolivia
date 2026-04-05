import { NextResponse } from 'next/server';
import { getOptionalAdminSession } from '@/lib/admin-auth';
import { normalizeServiceAdminInput } from '@/lib/admin-services';
import type { ServiceAdminInput, ServiceAdminRow } from '@/lib/admin-service-types';
import {
  stripSupportServiceOptionalFields,
  SUPPORT_SERVICE_OPTIONAL_COLUMNS,
  withSupportServiceDefaults,
} from '@/lib/support-services-compat';
import {
  getMissingSupportServicesMessage,
  isMissingColumnError,
  isMissingTableError,
} from '@/lib/supabase-errors';
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

    let { data, error } = await supabase
      .from('support_services')
      .insert(payload)
      .select()
      .single();

    if (isMissingColumnError(error, 'support_services', SUPPORT_SERVICE_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('support_services')
        .insert(stripSupportServiceOptionalFields(payload))
        .select()
        .single();

      data = legacyResult.data
        ? withSupportServiceDefaults(legacyResult.data as Partial<ServiceAdminRow>)
        : null;
      error = legacyResult.error;
    }

    if (isMissingTableError(error, 'support_services')) {
      return NextResponse.json({ error: getMissingSupportServicesMessage() }, { status: 400 });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, service: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado' },
      { status: 500 }
    );
  }
}
