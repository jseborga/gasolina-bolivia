export type Station = {
  id: number;
  name: string;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

export type ReportInsert = {
  station_id: number;
  fuel_type: "especial" | "premium" | "diesel";
  availability_status: "si_hay" | "no_hay" | "sin_dato";
  queue_status: "corta" | "media" | "larga" | "sin_dato";
  comment: string | null;
};

export type LatestReport = {
  station_id: number;
  fuel_type: string;
  availability_status: string;
  queue_status: string;
  comment: string | null;
  created_at: string;
};
