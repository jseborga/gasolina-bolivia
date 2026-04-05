export type StationAdminInput = {
  name: string;
  zone?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  fuel_especial?: boolean;
  fuel_premium?: boolean;
  fuel_diesel?: boolean;
  fuel_gnv?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  source_url?: string;
  notes?: string;
  license_code?: string;
};

export type StationAdminRow = {
  id: number;
  name: string;
  zone: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  fuel_especial: boolean;
  fuel_premium: boolean;
  fuel_diesel: boolean;
  fuel_gnv: boolean;
  is_active: boolean;
  is_verified: boolean;
  source_url: string | null;
  notes: string | null;
  license_code: string | null;
  created_at?: string;
  updated_at?: string;
};
