import Link from 'next/link';
import type { StationAdminRow } from '@/lib/admin-types';

export function StationTable({ stations }: { stations: StationAdminRow[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Estaciones</h2>
          <p className="text-sm text-slate-500">Administra catálogo, coordenadas y combustibles.</p>
        </div>
        <Link
          href="/admin/stations/new"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nueva estación
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Combustibles</th>
              <th className="px-4 py-3">Activa</th>
              <th className="px-4 py-3">Verificada</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const fuels = [
                station.fuel_especial ? 'Especial' : null,
                station.fuel_premium ? 'Premium' : null,
                station.fuel_diesel ? 'Diésel' : null,
                station.fuel_gnv ? 'GNV' : null,
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <tr key={station.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{station.name}</td>
                  <td className="px-4 py-3 text-slate-600">{station.zone || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{station.city || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{fuels || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{station.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-600">{station.is_verified ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/stations/${station.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StationTable;
