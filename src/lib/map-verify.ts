import { haversineKm } from '@/lib/geo';
import type {
  StationAddressCandidate,
  StationAdminRow,
  StationImportAuditItem,
  StationImportAuditResponse,
  StationLocationVerification,
  StationOffsetSuggestion,
} from '@/lib/admin-types';

const NOMINATIM_MIN_INTERVAL_MS = 1200;

let nominatimQueue: Promise<void> = Promise.resolve();
let lastNominatimRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(value?: string | number | null) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDisplayName(parts: Array<string | null | undefined>) {
  return parts.map((value) => value?.trim()).filter(Boolean).join(', ');
}

function normalizeCandidate(source: any): StationAddressCandidate | null {
  const latitude = toNumber(source?.lat);
  const longitude = toNumber(source?.lon);

  if (latitude == null || longitude == null) {
    return null;
  }

  const address = source?.address ?? {};
  const road =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.residential ||
    '';
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.state_district ||
    '';
  const displayName =
    source?.display_name ||
    buildDisplayName([
      road,
      address.suburb || address.neighbourhood,
      city,
    ]);

  return {
    city,
    displayName,
    latitude,
    longitude,
    road,
  };
}

async function fetchJson(url: string) {
  const runRequest = async () => {
    const waitMs = Math.max(
      0,
      lastNominatimRequestAt + NOMINATIM_MIN_INTERVAL_MS - Date.now()
    );
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'accept-language': 'es',
        'user-agent': 'SurtiMapaAdmin/1.0',
      },
    });

    lastNominatimRequestAt = Date.now();

    if (!response.ok) {
      throw new Error(`Error de geocodificacion: ${response.status}`);
    }

    return response.json();
  };

  const task = nominatimQueue.then(runRequest, runRequest);
  nominatimQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

async function geocodeAddress(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const query = new URLSearchParams({
    addressdetails: '1',
    countrycodes: 'bo',
    format: 'jsonv2',
    limit: '1',
    q: trimmed,
  });

  const json = await fetchJson(`https://nominatim.openstreetmap.org/search?${query.toString()}`);
  if (!Array.isArray(json) || json.length === 0) return null;

  return normalizeCandidate(json[0]);
}

async function reverseGeocode(latitude: number, longitude: number) {
  const query = new URLSearchParams({
    addressdetails: '1',
    format: 'jsonv2',
    lat: latitude.toString(),
    lon: longitude.toString(),
    zoom: '18',
  });

  const json = await fetchJson(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`);
  return normalizeCandidate(json);
}

function buildVerificationStatus(issues: string[], addressCandidate: StationAddressCandidate | null, reverseCandidate: StationAddressCandidate | null): StationLocationVerification['status'] {
  if (issues.length === 0 && !addressCandidate && !reverseCandidate) {
    return 'missing';
  }

  if (
    issues.some((issue) =>
      issue.includes('muy separados') ||
      issue.includes('diferencia importante') ||
      issue.includes('No se pudo')
    )
  ) {
    return 'warning';
  }

  if (issues.length > 0) {
    return 'missing';
  }

  return 'ok';
}

export async function verifyStationLocation(params: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<StationLocationVerification> {
  const inputAddress = params.address?.trim() ?? '';
  const inputLatitude = params.latitude ?? null;
  const inputLongitude = params.longitude ?? null;
  const issues: string[] = [];

  let addressCandidate: StationAddressCandidate | null = null;
  let reverseCandidate: StationAddressCandidate | null = null;

  try {
    addressCandidate = inputAddress ? await geocodeAddress(inputAddress) : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Error de geocodificacion: 429')
    ) {
      issues.push(
        'Geocodificador temporalmente limitado (429). Espera un momento y vuelve a auditar.'
      );
    } else {
      throw error;
    }
  }

  try {
    reverseCandidate =
      inputLatitude != null && inputLongitude != null
        ? await reverseGeocode(inputLatitude, inputLongitude)
        : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Error de geocodificacion: 429')
    ) {
      issues.push(
        'Reverse geocoding temporalmente limitado (429). Espera un momento y vuelve a auditar.'
      );
    } else {
      throw error;
    }
  }

  let distanceKm: number | null = null;
  if (
    addressCandidate &&
    inputLatitude != null &&
    inputLongitude != null
  ) {
    distanceKm = haversineKm(
      inputLatitude,
      inputLongitude,
      addressCandidate.latitude,
      addressCandidate.longitude
    );
  }

  if (!inputAddress) {
    issues.push('Falta direccion para comparar.');
  }

  if (inputLatitude == null || inputLongitude == null) {
    issues.push('Faltan coordenadas para comparar.');
  }

  if (!addressCandidate && inputAddress) {
    issues.push('No se pudo ubicar la direccion en el geocodificador.');
  }

  if (!reverseCandidate && inputLatitude != null && inputLongitude != null) {
    issues.push('No se pudo obtener una calle aproximada desde el punto.');
  }

  if (distanceKm != null) {
    if (distanceKm > 0.8) {
      issues.push('La direccion y el punto estan muy separados.');
    } else if (distanceKm > 0.25) {
      issues.push('La direccion y el punto muestran una diferencia importante.');
    }
  }

  return {
    addressCandidate,
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(3)) : null,
    inputAddress,
    inputLatitude,
    inputLongitude,
    issues,
    reverseCandidate,
    status: buildVerificationStatus(issues, addressCandidate, reverseCandidate),
  };
}

function isImportedStation(station: StationAdminRow) {
  const note = (station.notes ?? '').toLowerCase();
  const sourceUrl = (station.source_url ?? '').toLowerCase();

  return (
    note.includes('importada desde lote de google maps') ||
    note.includes('importada desde openstreetmap') ||
    sourceUrl.includes('google.') ||
    sourceUrl.includes('maps.app.goo.gl') ||
    sourceUrl.includes('openstreetmap.org')
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function estimateOffset(items: StationImportAuditItem[]): StationOffsetSuggestion | null {
  const candidates = items.filter(
    (item) =>
      item.latitudeDelta != null &&
      item.longitudeDelta != null &&
      item.verification.distanceKm != null &&
      item.verification.distanceKm >= 0.08
  );

  if (candidates.length < 4) {
    return null;
  }

  const latitudeDelta = median(
    candidates.map((item) => item.latitudeDelta as number)
  );
  const longitudeDelta = median(
    candidates.map((item) => item.longitudeDelta as number)
  );

  const residuals = candidates.map((item) => {
    const adjustedLatitude = (item.station.latitude as number) + latitudeDelta;
    const adjustedLongitude = (item.station.longitude as number) + longitudeDelta;
    const addressCandidate = item.verification.addressCandidate!;

    return haversineKm(
      adjustedLatitude,
      adjustedLongitude,
      addressCandidate.latitude,
      addressCandidate.longitude
    );
  });

  const residualKm = Number(
    (residuals.reduce((sum, value) => sum + value, 0) / residuals.length).toFixed(3)
  );
  const confidence: StationOffsetSuggestion['confidence'] =
    residualKm <= 0.12 && candidates.length >= 5 ? 'high' : 'low';

  return {
    confidence,
    latitudeDelta: Number(latitudeDelta.toFixed(6)),
    longitudeDelta: Number(longitudeDelta.toFixed(6)),
    residualKm,
    sampleCount: candidates.length,
  };
}

export async function auditImportedStations(
  stations: StationAdminRow[],
  maxItems = 20
): Promise<StationImportAuditResponse> {
  const importedStations = stations.filter(isImportedStation);
  const limitedStations = importedStations.slice(0, maxItems);
  const items: StationImportAuditItem[] = [];

  for (const station of limitedStations) {
    const verification = await verifyStationLocation({
      address: station.address,
      latitude: station.latitude,
      longitude: station.longitude,
    });

    items.push({
      latitudeDelta:
        verification.addressCandidate && station.latitude != null
          ? Number((verification.addressCandidate.latitude - station.latitude).toFixed(6))
          : null,
      longitudeDelta:
        verification.addressCandidate && station.longitude != null
          ? Number((verification.addressCandidate.longitude - station.longitude).toFixed(6))
          : null,
      station,
      verification,
    });
  }

  return {
    importedCount: importedStations.length,
    items,
    offsetSuggestion: estimateOffset(items),
    truncated: importedStations.length > limitedStations.length,
  };
}
