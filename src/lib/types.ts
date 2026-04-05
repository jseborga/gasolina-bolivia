export type FuelType = "especial" | "premium" | "diesel";
export type AvailabilityStatus = "si_hay" | "no_hay" | "sin_dato";
export type QueueStatus = "corta" | "media" | "larga" | "sin_dato";

export type Station = {
  id: number;
  name: string;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
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

export type StationWithLatest = Station & {
  latestReport: Report | null;
};
