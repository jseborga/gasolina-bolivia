type Props = {
  availability: "si_hay" | "no_hay" | "sin_dato" | null | undefined;
};

const styles: Record<string, string> = {
  si_hay: "bg-emerald-100 text-emerald-700",
  no_hay: "bg-rose-100 text-rose-700",
  sin_dato: "bg-amber-100 text-amber-700",
  default: "bg-slate-100 text-slate-600",
};

const labels: Record<string, string> = {
  si_hay: "Sí hay",
  no_hay: "No hay",
  sin_dato: "Sin dato",
  default: "Sin dato",
};

export function StatusBadge({ availability }: Props) {
  const key = availability ?? "default";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[key] ?? styles.default}`}>
      {labels[key] ?? labels.default}
    </span>
  );
}
