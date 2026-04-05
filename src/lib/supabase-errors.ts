type SupabaseErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

export function isMissingTableError(
  error: SupabaseErrorLike | null | undefined,
  tableName: string
) {
  if (!error) return false;

  const normalizedTable = tableName.trim().toLowerCase();
  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "PGRST205" ||
    (text.includes(normalizedTable) &&
      (text.includes("schema cache") || text.includes("could not find the table")))
  );
}

export function getMissingSupportServicesMessage() {
  return "Falta la tabla support_services en Supabase. Ejecuta la migración supabase/003_support_services.sql y vuelve a desplegar.";
}
