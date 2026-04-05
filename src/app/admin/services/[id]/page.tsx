import { notFound } from 'next/navigation';
import { requireAdminSession } from '@/lib/admin-auth';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import { ServiceForm } from '@/components/admin/service-form';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession(`/admin/services/${id}`);

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('support_services')
      .select('id,name,category,zone,city,address,latitude,longitude,phone,whatsapp_number,website_url,description,is_active,is_verified,source_url,notes,created_at,updated_at')
      .eq('id', Number(id))
      .single();

    if (error || !data) return notFound();

    return <ServiceForm mode="edit" serviceId={Number(id)} initial={data as ServiceAdminRow} />;
  } catch {
    return notFound();
  }
}
