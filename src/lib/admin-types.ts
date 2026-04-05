export type StationAdminInput = {
  name: string;
  zone?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  reputation_score?: number | null;
  reputation_votes?: number | null;
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
  reputation_score: number | null;
  reputation_votes: number | null;
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

export type StationImportAction = 'create' | 'review' | 'skip' | 'update';

export type StationImportMatch = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
  source_url: string | null;
};

export type StationImportPreviewItem = {
  raw: string;
  incomingAddress: string;
  incomingLatitude: number | null;
  incomingLongitude: number | null;
  incomingName: string;
  match: StationImportMatch | null;
  matchScore: number;
  nameScore: number;
  addressScore: number;
  distanceKm: number | null;
  reason: string;
  recommendedAction: StationImportAction;
  sourceUrl: string;
};

export type StationImportApplyItem = {
  raw: string;
  incomingAddress: string;
  incomingLatitude: number | null;
  incomingLongitude: number | null;
  incomingName: string;
  matchId: number | null;
  sourceUrl: string;
  action: StationImportAction;
};

export type StationAddressCandidate = {
  city: string;
  displayName: string;
  latitude: number;
  longitude: number;
  road: string;
};

export type StationLocationVerification = {
  addressCandidate: StationAddressCandidate | null;
  distanceKm: number | null;
  inputAddress: string;
  inputLatitude: number | null;
  inputLongitude: number | null;
  issues: string[];
  reverseCandidate: StationAddressCandidate | null;
  status: 'missing' | 'ok' | 'warning';
};

export type StationImportAuditItem = {
  latitudeDelta: number | null;
  longitudeDelta: number | null;
  station: StationAdminRow;
  verification: StationLocationVerification;
};

export type StationOffsetSuggestion = {
  confidence: 'high' | 'low';
  latitudeDelta: number;
  longitudeDelta: number;
  residualKm: number;
  sampleCount: number;
};

export type StationImportAuditResponse = {
  importedCount: number;
  items: StationImportAuditItem[];
  offsetSuggestion: StationOffsetSuggestion | null;
  truncated: boolean;
};
