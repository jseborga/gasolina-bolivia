"use client";

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import type { StationAdminRow } from '@/lib/admin-types';

function hasCoordinates(station: StationAdminRow) {
  return station.latitude != null && station.longitude != null;
}

function formatCoordinates(station: StationAdminRow) {
  if (!hasCoordinates(station)) return 'Sin punto fijo';
  return `${station.latitude?.toFixed(6)}, ${station.longitude?.toFixed(6)}`;
}

function formatUpdatedAt(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function StationTable({ stations }: { stations: StationAdminRow[] }) {
  const [query, setQuery] = useState('');
  const [pointFilter, setPointFilter] = useState<'all' | 'missing' | 'with'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const totals = {
    missingCoords: stations.filter((station) => !hasCoordinates(station)).length,
    total: stations.length,
    unverified: stations.filter((station) => !station.is_verified).length,
  };

  const filteredStations = stations.filter((station) => {
    const matchesQuery =
      deferredQuery.length === 0 ||
      [
        station.name,
        station.zone,
        station.city,
        station.address,
        station.license_code,
        station.notes,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(deferredQuery));

    const matchesPointFilter =
      pointFilter === 'all' ||
      (pointFilter === 'missing' ? !hasCoordinates(station) : hasCoordinates(station));

    const matchesVerification =
      verificationFilter === 'all' ||
      (verificationFilter === 'verified' ? station.is_verified : !station.is_verified);

    return matchesQuery && matchesPointFilter && matchesVerification;
  });

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totals.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sin coordenadas</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{totals.missingCoords}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sin verificar</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totals.unverified}</p>
        </div>
      </section>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Estaciones</h2>
            <p className="text-sm text-slate-500">Administra catálogo, coordenadas y combustibles.</p>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[620px] lg:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, zona, ciudad o dirección"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 lg:flex-1"
            />

            <select
              value={pointFilter}
              onChange={(event) => setPointFilter(event.target.value as typeof pointFilter)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="all">Todos los puntos</option>
              <option value="missing">Sin coordenadas</option>
              <option value="with">Con coordenadas</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value as typeof verificationFilter)
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="all">Todas las verificaciones</option>
              <option value="pending">Pendientes</option>
              <option value="verified">Verificadas</option>
            </select>

            <Link
              href="/admin/stations/new"
              className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
            >
              Nueva estación
            </Link>
            <Link
              href="/admin/stations/import"
              className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar lote
            </Link>
            <Link
              href="/admin/stations/import/review"
              className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Auditar importadas
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Estación</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Punto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Actualizada</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => {
                const fuels = [
                  station.fuel_especial ? 'Especial' : null,
                  station.fuel_premium ? 'Premium' : null,
                  station.fuel_diesel ? 'Diésel' : null,
                  station.fuel_gnv ? 'GNV' : null,
                ]
                  .filter(Boolean)
                  .join(', ');

                const googleMapsUrl = hasCoordinates(station)
                  ? `https://www.google.com/maps?q=${station.latitude},${station.longitude}`
                  : station.source_url || '';

                return (
                  <tr
                    key={station.id}
                    className={`border-t border-slate-100 ${
                      hasCoordinates(station) ? 'bg-white' : 'bg-amber-50/40'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{station.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {fuels || 'Sin combustibles marcados'}
                      </div>
                      {station.license_code ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Código: {station.license_code}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{station.city || '-'}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {[station.zone, station.address].filter(Boolean).join(' | ') || 'Sin dirección'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{formatCoordinates(station)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {station.source_url ? 'Con URL de origen' : 'Sin URL de origen'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            station.is_verified
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {station.is_verified ? 'Verificada' : 'Pendiente'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            station.is_active
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {station.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatUpdatedAt(station.updated_at || station.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/stations/${station.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </Link>

                        {googleMapsUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Abrir mapa
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStations.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No hay estaciones que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StationTable;
