export type Station = {
  id: number;
  name: string;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

export type LatestReport = {
  id: number;
  station_id: number;
  fuel_type: "especial" | "premium" | "diesel";
  availability_status: "si_hay" | "no_hay" | "sin_dato";
  queue_status: "corta" | "media" | "larga" | "sin_dato";
  comment: string | null;
  created_at: string;
};

export type StationWithLatest = Station & {
  latestReport: LatestReport | null;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
};
