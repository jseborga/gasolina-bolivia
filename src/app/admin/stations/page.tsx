import { StationTable } from '@/components/admin/station-table';
import { requireAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow } from '@/lib/admin-types';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminStationsPage() {
  await requireAdminSession('/admin/stations');

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('stations')
      .select('id,name,zone,city,address,latitude,longitude,reputation_score,reputation_votes,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar estaciones: {error.message}
        </div>
      );
    }

    return <StationTable stations={(data ?? []) as StationAdminRow[]} />;
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar estaciones:{' '}
        {error instanceof Error ? error.message : 'Error inesperado'}
      </div>
    );
  }
}
