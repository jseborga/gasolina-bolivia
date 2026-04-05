import { notFound } from 'next/navigation';
import { requireAdminSession } from '@/lib/admin-auth';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import { ServiceForm } from '@/components/admin/service-form';
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

export const dynamic = 'force-dynamic';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession(`/admin/services/${id}`);

  const serviceId = Number(id);
  if (!Number.isFinite(serviceId)) {
    return notFound();
  }

  try {
    const supabase = getAdminSupabase();
    const initialResult = await supabase
      .from('support_services')
      .select(SUPPORT_SERVICE_SELECT)
      .eq('id', serviceId)
      .single();
    let data: ServiceAdminRow | null = null;
    let error = initialResult.error;

    if (!error && initialResult.data) {
      data = initialResult.data as unknown as ServiceAdminRow;
    }

    if (isMissingTableError(error, 'support_services')) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {getMissingSupportServicesMessage()}
        </div>
      );
    }

    if (isMissingColumnError(error, 'support_services', SUPPORT_SERVICE_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('support_services')
        .select(SUPPORT_SERVICE_BASE_SELECT)
        .eq('id', serviceId)
        .single();

      if (isMissingTableError(legacyResult.error, 'support_services')) {
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            {getMissingSupportServicesMessage()}
          </div>
        );
      }

      if (legacyResult.error) {
        return (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error al cargar el servicio: {legacyResult.error.message}
          </div>
        );
      }

      data = legacyResult.data
        ? withSupportServiceDefaults(legacyResult.data as Partial<ServiceAdminRow>)
        : null;
      error = null;
    }

    if (error || !data) return notFound();

    return <ServiceForm mode="edit" serviceId={serviceId} initial={data as ServiceAdminRow} />;
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar el servicio: {error instanceof Error ? error.message : 'Error inesperado'}
      </div>
    );
  }
}
