export function formatRelativeDate(dateValue: string | null | undefined) {
  if (!dateValue) return "Sin fecha";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
