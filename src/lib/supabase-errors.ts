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

export function isMissingColumnError(
  error: SupabaseErrorLike | null | undefined,
  tableName: string,
  columnNames: string | readonly string[]
) {
  if (!error) return false;

  const normalizedTable = tableName.trim().toLowerCase();
  const normalizedColumns = (Array.isArray(columnNames) ? columnNames : [columnNames]).map(
    (columnName) => columnName.trim().toLowerCase()
  );
  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const mentionsColumn = normalizedColumns.some((columnName) =>
    text.includes(columnName)
  );

  return (
    ((error.code === "PGRST204" || error.code === "42703") && mentionsColumn) ||
    (text.includes(normalizedTable) &&
      mentionsColumn &&
      (text.includes("schema cache") ||
        text.includes("column") ||
        text.includes("could not find") ||
        text.includes("does not exist")))
  );
}

export function getMissingSupportServicesMessage() {
  return "Falta la tabla support_services en Supabase. Ejecuta la migraciÃ³n supabase/003_support_services.sql y vuelve a desplegar.";
}

export function getMissingParkingSitesMessage() {
  return "Falta la tabla parking_sites en Supabase. Ejecuta la migraciÃ³n supabase/010_parking_profiles_and_sites.sql y vuelve a desplegar.";
}

export function getMissingAppProfilesMessage() {
  return "Falta la tabla app_profiles en Supabase. Ejecuta la migraciÃ³n supabase/010_parking_profiles_and_sites.sql y vuelve a desplegar.";
}

export function getMissingContributionModerationMessage() {
  return "Faltan las tablas o columnas de moderaciÃ³n y recompensas. Ejecuta la migraciÃ³n supabase/011_contributor_rewards_and_place_report_review.sql y vuelve a desplegar.";
}

export function getMissingAgentSuggestionsMessage() {
  return "Falta la tabla agent_report_suggestions. Ejecuta la migraciÃ³n supabase/012_ai_agent_suggestions.sql y vuelve a desplegar.";
}
