import { StationForm } from '@/components/admin/station-form';
import { requireAdminSession } from '@/lib/admin-auth';

type NewStationPageProps = {
  searchParams: Promise<{
    created?: string;
    name?: string;
  }>;
};

export default async function NewStationPage({ searchParams }: NewStationPageProps) {
  await requireAdminSession('/admin/stations/new');
  const params = await searchParams;

  return (
    <div className="space-y-4">
      {params.created === '1' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Se creó {params.name ? `"${params.name}"` : 'la estación'} y el formulario quedó listo para cargar otra.
        </div>
      ) : null}

      <StationForm mode="create" />
    </div>
  );
}
