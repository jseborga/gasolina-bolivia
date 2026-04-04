export function Header() {
  return (
    <header className="rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">La Paz · Bolivia</p>
          <h1 className="mt-2 text-3xl font-bold">SurtiMapa</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Estado colaborativo de surtidores, disponibilidad de combustible y filas en tiempo casi real.
          </p>
        </div>
        <a href="/api/health" className="text-sm font-medium text-slate-200 underline underline-offset-4">
          Probar healthcheck
        </a>
      </div>
    </header>
  )
}
