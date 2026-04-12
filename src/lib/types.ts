export type FuelType = "especial" | "premium" | "diesel";
export type AvailabilityStatus = "si_hay" | "no_hay" | "sin_dato";
export type QueueStatus = "corta" | "media" | "larga" | "sin_dato";
export type SupportServiceCategory =
  | "taller_mecanico"
  | "grua"
  | "servicio_mecanico"
  | "aditivos";

export type AppProfileRole =
  | "parking_manager"
  | "trusted_reporter"
  | "reviewer"
  | "admin_assistant";

export type ParkingStatus = "open" | "closed" | "full" | "unknown";

export type TrafficIncidentType =
  | "control_vial"
  | "corte_via"
  | "marcha"
  | "accidente"
  | "derrumbe"
  | "otro";

export type TrafficIncidentStatus = "active" | "resolved" | "expired";
export type TrafficIncidentVote = "confirm" | "reject";

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
  fuel_especial?: boolean;
  fuel_premium?: boolean;
  fuel_diesel?: boolean;
  fuel_gnv?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  source_url?: string | null;
  notes?: string | null;
  license_code?: string | null;
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
  is_published?: boolean;
  is_verified: boolean;
  source_url: string | null;
  notes: string | null;
};

export type SupportServiceWithDistance = SupportService & {
  distanceKm?: number | null;
};

export type AppProfile = {
  id: number;
  full_name: string;
  role: AppProfileRole;
  email: string | null;
  phone: string | null;
  phone_key?: string | null;
  whatsapp_number: string | null;
  whatsapp_key?: string | null;
  telegram_chat_id: string | null;
  manager_access_token: string;
  reliability_score: number | null;
  credit_balance: number | null;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ParkingSite = {
  id: number;
  code: string;
  name: string;
  city: string | null;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  total_spots: number | null;
  available_spots: number | null;
  pricing_text: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_24h: boolean;
  accepts_reservations: boolean;
  height_limit_text: string | null;
  payment_methods: string | null;
  access_notes: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  source_url: string | null;
  manager_profile_id: number | null;
  manager_name?: string | null;
  status: ParkingStatus;
  is_active: boolean;
  is_published: boolean;
  is_verified: boolean;
  last_update_source: string | null;
  last_updated_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ParkingSiteWithDistance = ParkingSite & {
  distanceKm?: number | null;
};

export type ParkingUpdateInput = {
  parking_site_id: number;
  status: ParkingStatus;
  available_spots?: number | null;
  pricing_text?: string;
  note?: string;
};

export type VendorRequestCategory =
  | SupportServiceCategory
  | "estacion"
  | "parqueo";

export type VendorRequestInput = {
  name: string;
  email: string;
  phone?: string;
  business_name?: string;
  category: VendorRequestCategory;
  city?: string;
  notes?: string;
};

export type VendorRequest = VendorRequestInput & {
  id: number;
  status: "pending" | "reviewing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type AppEvent = {
  id: number;
  created_at: string;
  event_type: string;
  target_type: string;
  target_id: number | null;
  target_name: string | null;
  path: string | null;
  referrer: string | null;
  ip_address: string | null;
  user_agent: string | null;
  visitor_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type PlaceReportReason =
  | "not_exists"
  | "wrong_location"
  | "duplicate"
  | "closed"
  | "other";

export type PlaceReport = {
  id: number;
  target_type: "station" | "service";
  target_id: number;
  target_name: string | null;
  reason: PlaceReportReason;
  notes: string | null;
  visitor_id: string | null;
  ip_address: string | null;
  latitude_bucket: number | null;
  longitude_bucket: number | null;
  created_at: string;
};

export type TrafficIncident = {
  id: number;
  incident_type: TrafficIncidentType;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  confirmation_count: number;
  rejection_count: number;
  duration_minutes: number;
  status: TrafficIncidentStatus;
  visitor_id: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
};
