import { requireAdminSession } from '@/lib/admin-auth';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import {
  SUPPORT_SERVICE_BASE_SELECT,
  SUPPORT_SERVICE_OPTIONAL_COLUMNS,
  SUPPORT_SERVICE_SELECT,
  withSupportServiceDefaults,
} from '@/lib/support-services-compat';
import {
  getMissingSupportServicesMessage,
  isMissingColumnError,
  isMissingTableError,
} from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';
import { ServiceTable } from '@/components/admin/service-table';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  await requireAdminSession('/admin/services');

  try {
    const supabase = getAdminSupabase();
    let { data, error } = await supabase
      .from('support_services')
      .select(SUPPORT_SERVICE_SELECT)
      .order('name', { ascending: true });

    if (isMissingColumnError(error, 'support_services', SUPPORT_SERVICE_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('support_services')
        .select(SUPPORT_SERVICE_BASE_SELECT)
        .order('name', { ascending: true });

      data = (legacyResult.data ?? []).map((service) =>
        withSupportServiceDefaults(service as Partial<ServiceAdminRow>)
      );
      error = legacyResult.error;
    }

    if (error) {
      if (isMissingTableError(error, 'support_services')) {
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            {getMissingSupportServicesMessage()}
          </div>
        );
      }

      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar servicios: {error.message}
        </div>
      );
    }

    return <ServiceTable services={(data ?? []) as ServiceAdminRow[]} />;
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar servicios: {error instanceof Error ? error.message : 'Error inesperado'}
      </div>
    );
  }
}
