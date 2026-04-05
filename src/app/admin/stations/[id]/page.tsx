import { notFound } from 'next/navigation';
import { StationForm } from '@/components/admin/station-form';
import type { StationAdminRow } from '@/lib/admin-types';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function EditStationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('stations')
    .select('id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at')
    .eq('id', Number(id))
    .single();

  if (error || !data) return notFound();

  return <StationForm mode="edit" stationId={Number(id)} initial={data as StationAdminRow} />;
}
