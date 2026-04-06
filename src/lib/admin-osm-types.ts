import type { ServiceAdminInput, ServiceAdminRow } from "@/lib/admin-service-types";
import type { StationAdminInput, StationAdminRow, StationImportAction } from "@/lib/admin-types";
import type { SupportServiceCategory } from "@/lib/types";

export type OSMImportTarget = "stations" | "services";

export type OSMImportRequest = {
  country?: string;
  department: string;
  serviceCategory?: SupportServiceCategory;
  target: OSMImportTarget;
};

export type OSMImportMatch = {
  address: string | null;
  city: string | null;
  id: number;
  latitude: number | null;
  longitude: number | null;
  name: string;
  source_url: string | null;
  zone: string | null;
};

export type OSMImportSourceMeta = {
  brand?: string | null;
  operator?: string | null;
  osm_id: number | null;
  osm_type: string | null;
  phone?: string | null;
  products?: string | null;
  website_url?: string | null;
};

export type OSMStationPreviewPayload = Pick<
  StationAdminInput,
  | "address"
  | "city"
  | "fuel_diesel"
  | "fuel_especial"
  | "fuel_gnv"
  | "fuel_premium"
  | "latitude"
  | "name"
  | "notes"
  | "source_url"
  | "zone"
>;

export type OSMServicePreviewPayload = Pick<
  ServiceAdminInput,
  | "address"
  | "category"
  | "city"
  | "description"
  | "latitude"
  | "longitude"
  | "meeting_point"
  | "name"
  | "notes"
  | "phone"
  | "price_text"
  | "source_url"
  | "website_url"
  | "whatsapp_number"
  | "zone"
>;

export type OSMImportPreviewItem = {
  actionHint?: string;
  distanceKm: number | null;
  incomingAddress: string;
  incomingCity: string;
  incomingLatitude: number | null;
  incomingLongitude: number | null;
  incomingName: string;
  incomingZone: string;
  match: OSMImportMatch | null;
  matchScore: number;
  nameScore: number;
  addressScore: number;
  raw: string;
  reason: string;
  recommendedAction: StationImportAction;
  sourceMeta: OSMImportSourceMeta;
  sourceUrl: string;
  target: OSMImportTarget;
  stationPayload?: OSMStationPreviewPayload;
  servicePayload?: OSMServicePreviewPayload;
};

export type OSMImportApplyItem = {
  action: StationImportAction;
  matchId: number | null;
  target: OSMImportTarget;
  stationPayload?: OSMStationPreviewPayload;
  servicePayload?: OSMServicePreviewPayload;
};

export type OSMImportPreviewResponse = {
  fetchedCount: number;
  items: OSMImportPreviewItem[];
  note: string | null;
  query: string;
  totalEntries: number;
  truncated: boolean;
};

export type OSMServiceExistingRow = ServiceAdminRow;
export type OSMStationExistingRow = StationAdminRow;
