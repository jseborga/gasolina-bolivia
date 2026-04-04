"use client";

type Props = {
  zoneOptions: string[];
  fuel: string;
  availability: string;
  zone: string;
  recentOnly: boolean;
  sortMode: string;
  onFuelChange: (value: string) => void;
  onAvailabilityChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onRecentOnlyChange: (value: boolean) => void;
  onSortModeChange: (value: string) => void;
  onReset: () => void;
};

export function FilterBar({
  zoneOptions,
  fuel,
  availability,
  zone,
  recentOnly,
  sortMode,
  onFuelChange,
  onAvailabilityChange,
  onZoneChange,
  onRecentOnlyChange,
  onSortModeChange,
  onReset,
}: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Filtros y orden</h2>
          <p className="mt-1 text-sm text-slate-500">
            Filtra por combustible, estado, zona y prioriza cercanía o recencia.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <select
          value={fuel}
          onChange={(event) => onFuelChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todos los combustibles</option>
          <option value="especial">Especial</option>
          <option value="premium">Premium</option>
          <option value="diesel">Diésel</option>
        </select>

        <select
          value={availability}
          onChange={(event) => onAvailabilityChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todos los estados</option>
          <option value="si_hay">Sí hay</option>
          <option value="no_hay">No hay</option>
          <option value="sin_dato">Sin dato</option>
        </select>

        <select
          value={zone}
          onChange={(event) => onZoneChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todas las zonas</option>
          {zoneOptions.map((zoneOption) => (
            <option key={zoneOption} value={zoneOption}>
              {zoneOption}
            </option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value)}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="recent">Más recientes</option>
          <option value="near">Más cercanos</option>
          <option value="available">Sí hay primero</option>
          <option value="short_queue">Fila más corta</option>
          <option value="name">Nombre</option>
        </select>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={recentOnly}
            onChange={(event) => onRecentOnlyChange(event.target.checked)}
          />
          Solo recientes
        </label>
      </div>
    </section>
  );
}
