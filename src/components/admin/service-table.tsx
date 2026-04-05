"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useState } from 'react';
import type { ServiceAdminRow } from '@/lib/admin-service-types';
import { getSupportServiceLabel } from '@/lib/services';

export function ServiceTable({ services }: { services: ServiceAdminRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filtered = services.filter((service) => {
    if (!deferredQuery) return true;
    return [
      service.name,
      service.zone,
      service.city,
      service.address,
      service.phone,
      service.whatsapp_number,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(deferredQuery));
  });

  const handleDelete = async (service: ServiceAdminRow) => {
    const confirmed = window.confirm(`¿Eliminar el servicio "${service.name}"?`);
    if (!confirmed) return;

    setDeletingId(service.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'DELETE',
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo eliminar el servicio.');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el servicio.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Servicios de auxilio</h2>
          <p className="text-sm text-slate-500">Talleres, grúas, mecánica y aditivos.</p>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[560px] lg:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, categoría, zona o contacto"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 lg:flex-1"
          />
          <Link href="/admin/services/new" className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800">
            Nuevo servicio
          </Link>
        </div>
      </div>

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((service) => (
              <tr key={service.id} className="border-t border-slate-100">
                <td className="px-4 py-4 font-medium text-slate-900">{service.name}</td>
                <td className="px-4 py-4 text-slate-600">{getSupportServiceLabel(service.category)}</td>
                <td className="px-4 py-4 text-slate-600">
                  {[service.zone, service.city, service.address].filter(Boolean).join(' | ') || '-'}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {[service.phone, service.whatsapp_number].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {service.is_active ? 'Activo' : 'Inactivo'} | {service.is_published ? 'Publicado' : 'Borrador'} | {service.is_verified ? 'Verificado' : 'Pendiente'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/services/${service.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(service)}
                      disabled={deletingId === service.id}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === service.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay servicios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ServiceTable;
