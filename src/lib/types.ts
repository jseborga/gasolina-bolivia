export type FuelType = "especial" | "premium" | "diesel";
export type AvailabilityStatus = "si_hay" | "no_hay" | "sin_dato";
export type QueueStatus = "corta" | "media" | "larga" | "sin_dato";
export type SupportServiceCategory =
  | "taller_mecanico"
  | "grua"
  | "servicio_mecanico"
  | "aditivos";

export type UserLocation = {
  lat: number;
  lng: number;
};

export type Station = {
  id: number;
  name: string;
  zone: string | null;
  city?: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  reputation_score?: number | null;
  reputation_votes?: number | null;
  is_active?: boolean;
};

export type Report = {
  id: number;
  station_id: number;
  fuel_type: FuelType;
  availability_status: AvailabilityStatus;
  queue_status: QueueStatus;
  comment: string | null;
  created_at: string;
};

export type ReportInput = {
  station_id: number;
  fuel_type: FuelType;
  availability_status: AvailabilityStatus;
  queue_status: QueueStatus;
  comment?: string;
};

export type StationWithLatest = Station & {
  latestReport?: Report | null;
  distanceKm?: number | null;
};

export type SupportService = {
  id: number;
  name: string;
  category: SupportServiceCategory;
  zone: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp_number: string | null;
  website_url: string | null;
  description: string | null;
  price_text: string | null;
  meeting_point: string | null;
  rating_score: number | null;
  rating_count: number | null;
  is_active: boolean;
  is_verified: boolean;
  source_url: string | null;
  notes: string | null;
};

export type SupportServiceWithDistance = SupportService & {
  distanceKm?: number | null;
};
