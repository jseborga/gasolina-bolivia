import { StationForm } from '@/components/admin/station-form';
import { requireAdminSession } from '@/lib/admin-auth';

export default async function NewStationPage() {
  await requireAdminSession('/admin/stations/new');
  return <StationForm mode="create" />;
}
