import Link from 'next/link';
import type { ReactNode } from 'react';
import { getOptionalAdminSession } from '@/lib/admin-auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getOptionalAdminSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Admin | SurtiMapa</h1>
            <p className="text-sm text-slate-500">Gestión interna de estaciones de servicio.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/admin" className="text-slate-700 hover:text-slate-900">
                Inicio admin
              </Link>
              <Link href="/admin/stations" className="text-slate-700 hover:text-slate-900">
                Estaciones
              </Link>
              <Link href="/admin/stations/import" className="text-slate-700 hover:text-slate-900">
                Importar
              </Link>
              <Link href="/" className="text-slate-700 hover:text-slate-900">
                Volver a la app
              </Link>
            </nav>

            {session ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">{session.email}</span>
                <form action="/api/admin/logout" method="post">
                  <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white">
                    Salir
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/admin/login"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
