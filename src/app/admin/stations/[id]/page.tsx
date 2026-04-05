import { notFound } from 'next/navigation';
import {
  STATION_ADMIN_SELECT,
  STATION_BASE_SELECT,
  STATION_OPTIONAL_COLUMNS,
  withStationOptionalDefaults,
} from '@/lib/admin-stations-compat';
import { StationForm } from '@/components/admin/station-form';
import { requireAdminSession } from '@/lib/admin-auth';
import type { StationAdminRow } from '@/lib/admin-types';
import { isMissingColumnError } from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function EditStationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession(`/admin/stations/${id}`);

  const stationId = Number(id);
  if (!Number.isFinite(stationId)) {
    return notFound();
  }

  try {
    const supabase = getAdminSupabase();
    const initialResult = await supabase
      .from('stations')
      .select(STATION_ADMIN_SELECT)
      .eq('id', stationId)
      .single();
    let data: StationAdminRow | null = null;
    let error = initialResult.error;

    if (!error && initialResult.data) {
      data = initialResult.data as unknown as StationAdminRow;
    }

    if (isMissingColumnError(error, 'stations', STATION_OPTIONAL_COLUMNS)) {
      const legacyResult = await supabase
        .from('stations')
        .select(STATION_BASE_SELECT)
        .eq('id', stationId)
        .single();

      if (legacyResult.error) {
        return (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            Error al cargar la estacion: {legacyResult.error.message}
          </div>
        );
      }

      data = legacyResult.data
        ? withStationOptionalDefaults(legacyResult.data as Partial<StationAdminRow>)
        : null;
      error = null;
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Error al cargar la estacion: {error.message}
        </div>
      );
    }

    if (!data) return notFound();

    return <StationForm mode="edit" stationId={stationId} initial={data as StationAdminRow} />;
  } catch (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar la estacion:{' '}
        {error instanceof Error ? error.message : 'Error inesperado'}
      </div>
    );
  }
}
