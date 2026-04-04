type Props = {
  availability: "si_hay" | "no_hay" | "sin_dato" | null | undefined;
  small?: boolean;
};

const styles: Record<string, string> = {
  si_hay: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  no_hay: "bg-rose-100 text-rose-700 ring-rose-200",
  sin_dato: "bg-amber-100 text-amber-700 ring-amber-200",
  default: "bg-slate-100 text-slate-600 ring-slate-200",
};

const labels: Record<string, string> = {
  si_hay: "Sí hay",
  no_hay: "No hay",
  sin_dato: "Sin dato",
  default: "Sin dato",
};

export function StatusBadge({ availability, small = false }: Props) {
  const key = availability ?? "default";

  return (
    <span
      className={`inline-flex items-center rounded-full ring-1 ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs"
      } font-semibold ${styles[key] ?? styles.default}`}
    >
      {labels[key] ?? labels.default}
    </span>
  );
}
