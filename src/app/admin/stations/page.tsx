import { StationTable } from '@/components/admin/station-table';
import {
  STATION_ADMIN_SELECT,
  STATION_BASE_SELECT,
  STATION_OPTIONAL_COLUMNS,
  withStationOptionalDefaults,
} from '@/lib/admin-stations-compat';
import { requireAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow } from '@/lib/admin-types';
import { isMissingColumnError } from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminStationsPage() {
  await requireAdminSession('/admin/stations');

  try {
    const supabase = getAdminSupabase();
    const initialResult = await supabase
      .from('stations')
      .select(STATION_ADMIN_SELECT)
      .order('name', { ascending: true });
    let data = (initialResult.data ?? []) as StationAdminRow[];
    let error = initialResult.error;

    if (isMissingColumnError(error, 'stations', STATION_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('stations')
        .select(STATION_BASE_SELECT)
        .order('name', { ascending: true });

      data = (legacyResult.data ?? []).map((station) =>
        withStationOptionalDefaults(station as Partial<StationAdminRow>)
      );
      error = legacyResult.error;
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar estaciones: {error.message}
        </div>
      );
    }

    return <StationTable stations={data} />;
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar estaciones:{' '}
        {error instanceof Error ? error.message : 'Error inesperado'}
      </div>
    );
  }
}
