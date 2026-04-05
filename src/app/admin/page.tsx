import Link from 'next/link';
import { requireAdminSession } from '@/lib/admin-auth';
import { isMissingTableError } from '@/lib/supabase-errors';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  await requireAdminSession('/admin');

  let stats = {
    events: 0,
    missingCoords: 0,
    total: 0,
    unverified: 0,
    vendorRequests: 0,
  };
  let loadError: string | null = null;

  try {
    const supabase = getAdminSupabase();
    const [
      { data: stationsData, error: stationsError },
      { count: eventsCount, error: eventsError },
      { count: vendorRequestsCount, error: vendorRequestsError },
    ] = await Promise.all([
      supabase.from('stations').select('id,latitude,longitude,is_verified'),
      supabase.from('app_events').select('*', { count: 'exact', head: true }),
      supabase.from('vendor_requests').select('*', { count: 'exact', head: true }),
    ]);

    if (stationsError) {
      loadError = stationsError.message;
    } else {
      const rows = stationsData ?? [];
      stats = {
        events: isMissingTableError(eventsError, 'app_events') ? 0 : eventsCount ?? 0,
        missingCoords: rows.filter((row) => row.latitude == null || row.longitude == null).length,
        total: rows.length,
        unverified: rows.filter((row) => !row.is_verified).length,
        vendorRequests: isMissingTableError(vendorRequestsError, 'vendor_requests')
          ? 0
          : vendorRequestsCount ?? 0,
      };

      if (eventsError && !isMissingTableError(eventsError, 'app_events')) {
        loadError = eventsError.message;
      } else if (
        vendorRequestsError &&
        !isMissingTableError(vendorRequestsError, 'vendor_requests')
      ) {
        loadError = vendorRequestsError.message;
      }
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el resumen del admin.';
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          El admin inició, pero falta terminar la configuración server-side: {loadError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
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
          <p className="text-sm text-slate-500">Solicitudes comerciales</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.vendorRequests}</p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gestión de estaciones</h2>
          <p className="mt-2 text-sm text-slate-600">
            Crea, edita y completa datos de nuevas estaciones: nombre, dirección,
            latitud, longitud, combustibles y notas.
          </p>
          <div className="mt-5">
            <div className="flex flex-wrap gap-3">
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
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Servicios de auxilio</h2>
          <p className="mt-2 text-sm text-slate-600">
            Carga talleres mecánicos, grúas, servicio mecánico móvil y venta de aditivos con contacto directo.
          </p>
          <div className="mt-5">
            <div className="flex flex-wrap gap-3">
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
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Cómo registrar una estación</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Entra a “Nueva estación”.</li>
            <li>Pega dirección, coordenadas o URL de Google Maps si la tienes.</li>
            <li>Usa “Analizar y completar” para resolver URLs cortas y extraer lat/lng.</li>
            <li>Revisa combustibles, estado activo y notas.</li>
            <li>Guarda y vuelve a la lista.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
