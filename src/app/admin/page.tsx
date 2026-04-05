import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Gestión de estaciones</h2>
        <p className="mt-2 text-sm text-slate-600">
          Crea, edita y completa datos de nuevas estaciones: nombre, dirección, latitud, longitud, combustibles y notas.
        </p>
        <div className="mt-5">
          <Link href="/admin/stations" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Abrir admin de estaciones
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cómo registrar una estación</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Entra a “Nueva estación”.</li>
          <li>Pega dirección, coordenadas o URL de Google Maps si la tienes.</li>
          <li>Usa “Analizar y completar” para extraer lat/lng cuando la URL lo incluya.</li>
          <li>Revisa combustibles, estado activo y notas.</li>
          <li>Guarda y vuelve a la lista.</li>
        </ol>
      </section>
    </div>
  );
}
