"use client";

type Props = {
  zoneOptions: string[];
};

export function FilterBar({ zoneOptions }: Props) {
  return (
    <form className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">Filtros rápidos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Filtra por combustible, estado o zona.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <select
          name="fuel"
          defaultValue=""
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todos los combustibles</option>
          <option value="especial">Especial</option>
          <option value="premium">Premium</option>
          <option value="diesel">Diésel</option>
        </select>

        <select
          name="availability"
          defaultValue=""
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todos los estados</option>
          <option value="si_hay">Sí hay</option>
          <option value="no_hay">No hay</option>
          <option value="sin_dato">Sin dato</option>
        </select>

        <select
          name="zone"
          defaultValue=""
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Todas las zonas</option>
          {zoneOptions.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
          <input type="checkbox" name="recentOnly" />
          Solo reportes recientes
        </label>
      </div>
    </form>
  );
}
