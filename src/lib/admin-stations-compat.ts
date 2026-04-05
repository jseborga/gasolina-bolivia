import type { StationAdminRow } from "@/lib/admin-types";

export const STATION_OPTIONAL_COLUMNS = [
  "reputation_score",
  "reputation_votes",
] as const;

export const STATION_BASE_SELECT =
  "id,name,zone,city,address,latitude,longitude,fuel_especial,fuel_premium,fuel_diesel,fuel_gnv,is_active,is_verified,source_url,notes,license_code,created_at,updated_at";

export const STATION_ADMIN_SELECT = `${STATION_BASE_SELECT},${STATION_OPTIONAL_COLUMNS.join(",")}`;

export function withStationOptionalDefaults(
  station: Partial<StationAdminRow>
): StationAdminRow {
  return {
    reputation_score: 0,
    reputation_votes: 0,
    ...station,
  } as StationAdminRow;
}

export function stripStationOptionalFields<T extends Record<string, unknown>>(
  payload: T
) {
  const { reputation_score, reputation_votes, ...legacyPayload } = payload;
  return legacyPayload;
}
