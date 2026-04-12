import Link from 'next/link';
import { requireAdminSession } from '@/lib/admin-auth';
import {
  getMissingAppProfilesMessage,
  getMissingParkingSitesMessage,
  isMissingTableError,
} from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  await requireAdminSession('/admin');

  let stats = {
    events: 0,
    missingCoords: 0,
    parkingSites: 0,
    profiles: 0,
    total: 0,
    unverified: 0,
    vendorRequests: 0,
  };
  let loadError: string | null = null;
  let parkingWarning: string | null = null;
  let profilesWarning: string | null = null;

  try {
    const supabase = getAdminSupabase();
    const [
      { data: stationsData, error: stationsError },
      { count: eventsCount, error: eventsError },
      { count: vendorRequestsCount, error: vendorRequestsError },
      { count: parkingSitesCount, error: parkingSitesError },
      { count: profilesCount, error: profilesError },
    ] = await Promise.all([
      supabase.from('stations').select('id,latitude,longitude,is_verified'),
      supabase.from('app_events').select('*', { count: 'exact', head: true }),
      supabase.from('vendor_requests').select('*', { count: 'exact', head: true }),
      supabase.from('parking_sites').select('*', { count: 'exact', head: true }),
      supabase.from('app_profiles').select('*', { count: 'exact', head: true }),
    ]);

    if (stationsError) {
      loadError = stationsError.message;
    } else {
      const rows = stationsData ?? [];
      stats = {
        events: isMissingTableError(eventsError, 'app_events') ? 0 : eventsCount ?? 0,
        missingCoords: rows.filter((row) => row.latitude == null || row.longitude == null).length,
        parkingSites: isMissingTableError(parkingSitesError, 'parking_sites')
          ? 0
          : parkingSitesCount ?? 0,
        profiles: isMissingTableError(profilesError, 'app_profiles') ? 0 : profilesCount ?? 0,
        total: rows.length,
        unverified: rows.filter((row) => !row.is_verified).length,
        vendorRequests: isMissingTableError(vendorRequestsError, 'vendor_requests')
          ? 0
          : vendorRequestsCount ?? 0,
      };

      parkingWarning = isMissingTableError(parkingSitesError, 'parking_sites')
        ? getMissingParkingSitesMessage()
        : null;
      profilesWarning = isMissingTableError(profilesError, 'app_profiles')
        ? getMissingAppProfilesMessage()
        : null;

      if (eventsError && !isMissingTableError(eventsError, 'app_events')) {
        loadError = eventsError.message;
      } else if (
        vendorRequestsError &&
        !isMissingTableError(vendorRequestsError, 'vendor_requests')
      ) {
        loadError = vendorRequestsError.message;
      } else if (
        parkingSitesError &&
        !isMissingTableError(parkingSitesError, 'parking_sites')
      ) {
        loadError = parkingSitesError.message;
      } else if (profilesError && !isMissingTableError(profilesError, 'app_profiles')) {
        loadError = profilesError.message;
      }
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : 'No se pudo cargar el resumen del admin.';
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          El admin inicio, pero falta terminar la configuracion server-side: {loadError}
        </div>
      ) : null}

      {parkingWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {parkingWarning}
        </div>
      ) : null}

      {profilesWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {profilesWarning}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estaciones</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sin punto fijo</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{stats.missingCoords}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pendientes de verificar</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.unverified}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Eventos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.events}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Parqueos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.parkingSites}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Perfiles</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.profiles}</p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gestion de estaciones</h2>
          <p className="mt-2 text-sm text-slate-600">
            Crea, edita y completa datos de nuevas estaciones: nombre, direccion, latitud,
            longitud, combustibles y notas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/stations"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir admin de estaciones
            </Link>
            <Link
              href="/admin/stations/import"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar lote
            </Link>
            <Link
              href="/admin/stations/import/review"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Auditar importadas
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Servicios de auxilio</h2>
          <p className="mt-2 text-sm text-slate-600">
            Carga talleres mecanicos, gruas, servicio movil y venta de aditivos con contacto
            directo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/services"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir admin de servicios
            </Link>
            <Link
              href="/admin/vendor-requests"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver solicitudes
            </Link>
            <Link
              href="/admin/analytics"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver analytics
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Parqueos y perfiles</h2>
          <p className="mt-2 text-sm text-slate-600">
            Administra parqueos, asigna encargados y habilita actualizaciones por portal o
            webhook.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/parking-sites"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir admin de parqueos
            </Link>
            <Link
              href="/admin/profiles"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver perfiles y roles
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Cada perfil puede recibir confiabilidad, creditos y un enlace privado de gestion.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Como registrar una estacion</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Entra a "Nueva estacion".</li>
            <li>Pega direccion, coordenadas o URL de Google Maps si la tienes.</li>
            <li>Usa "Analizar y completar" para resolver URLs cortas y extraer lat/lng.</li>
            <li>Revisa combustibles, estado activo y notas.</li>
            <li>Guarda y vuelve a la lista.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
