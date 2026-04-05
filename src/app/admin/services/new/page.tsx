import { requireAdminSession } from '@/lib/admin-auth';
import { ServiceForm } from '@/components/admin/service-form';

type NewServicePageProps = {
  searchParams: Promise<{ created?: string; name?: string }>;
};

export default async function NewServicePage({ searchParams }: NewServicePageProps) {
  await requireAdminSession('/admin/services/new');
  const params = await searchParams;

  return (
    <div className="space-y-4">
      {params.created === '1' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Se creó {params.name ? `"${params.name}"` : 'el servicio'} y el formulario quedó listo para cargar otro.
        </div>
      ) : null}

      <ServiceForm mode="create" />
    </div>
  );
}
