import { notFound } from 'next/navigation';
import { requireAdminSession } from '@/lib/admin-auth';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import { ServiceForm } from '@/components/admin/service-form';
import {
  getMissingSupportServicesMessage,
  isMissingTableError,
} from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession(`/admin/services/${id}`);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('support_services')
      .select('id,name,category,zone,city,address,latitude,longitude,phone,whatsapp_number,website_url,description,price_text,meeting_point,rating_score,rating_count,is_active,is_verified,source_url,notes,created_at,updated_at')
      .eq('id', Number(id))
      .single();

    if (isMissingTableError(error, 'support_services')) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {getMissingSupportServicesMessage()}
        </div>
      );
    }

    if (error || !data) return notFound();

    return <ServiceForm mode="edit" serviceId={Number(id)} initial={data as ServiceAdminRow} />;
  } catch {
    return notFound();
  }
}
