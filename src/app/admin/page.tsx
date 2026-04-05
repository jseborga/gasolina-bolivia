import Link from 'next/link';
import { requireAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  await requireAdminSession('/admin');

  let stats = {
    missingCoords: 0,
    total: 0,
    unverified: 0,
  };
  let loadError: string | null = null;

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('stations')
      .select('id,latitude,longitude,is_verified');

    if (error) {
      loadError = error.message;
    } else {
      const rows = data ?? [];
      stats = {
        missingCoords: rows.filter((row) => row.latitude == null || row.longitude == null).length,
        total: rows.length,
        unverified: rows.filter((row) => !row.is_verified).length,
      };
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

      <section className="grid gap-4 md:grid-cols-3">
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
