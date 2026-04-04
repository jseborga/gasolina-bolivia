export function Header() {
  return (
    <header className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">MVP</p>
          <h1 className="mt-2 text-3xl font-bold">SurtiMapa</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Reporta disponibilidad de combustible y estado de filas para ayudar a otros conductores.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
          PWA lista para EasyPanel
        </div>
      </div>
    </header>
  )
}
