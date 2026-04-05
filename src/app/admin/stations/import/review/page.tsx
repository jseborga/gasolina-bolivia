import { requireAdminSession } from '@/lib/admin-auth';
import { ImportAudit } from '@/components/admin/import-audit';

export const dynamic = 'force-dynamic';

export default async function ImportReviewPage() {
  await requireAdminSession('/admin/stations/import/review');
  return <ImportAudit />;
}
