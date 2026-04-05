import { StationImporter } from '@/components/admin/station-importer';
import { requireAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function ImportStationsPage() {
  await requireAdminSession('/admin/stations/import');
  return <StationImporter />;
}
