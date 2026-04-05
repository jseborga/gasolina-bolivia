import { requireAdminSession } from '@/lib/admin-auth';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import {
  getMissingSupportServicesMessage,
  isMissingTableError,
} from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';
import { ServiceTable } from '@/components/admin/service-table';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  await requireAdminSession('/admin/services');

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('support_services')
      .select('id,name,category,zone,city,address,latitude,longitude,phone,whatsapp_number,website_url,description,is_active,is_verified,source_url,notes,created_at,updated_at')
      .order('name', { ascending: true });

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
