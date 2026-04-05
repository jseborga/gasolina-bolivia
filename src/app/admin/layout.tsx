import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Admin · SurtiMapa</h1>
            <p className="text-sm text-slate-500">Gestión interna de estaciones de servicio.</p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin" className="text-slate-700 hover:text-slate-900">Inicio admin</Link>
            <Link href="/admin/stations" className="text-slate-700 hover:text-slate-900">Estaciones</Link>
            <Link href="/" className="text-slate-700 hover:text-slate-900">Volver a la app</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
