import { haversineKm } from '@/lib/geo';
import type {
  StationAddressCandidate,
  StationLocationVerification,
} from '@/lib/admin-types';

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
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'accept-language': 'es',
      'user-agent': 'SurtiMapaAdmin/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Error de geocodificacion: ${response.status}`);
  }

  return response.json();
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

export async function verifyStationLocation(params: {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<StationLocationVerification> {
  const inputAddress = params.address?.trim() ?? '';
  const inputLatitude = params.latitude ?? null;
  const inputLongitude = params.longitude ?? null;
  const issues: string[] = [];

  const [addressCandidate, reverseCandidate] = await Promise.all([
    inputAddress ? geocodeAddress(inputAddress) : Promise.resolve(null),
    inputLatitude != null && inputLongitude != null
      ? reverseGeocode(inputLatitude, inputLongitude)
      : Promise.resolve(null),
  ]);

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

  let status: StationLocationVerification['status'] = 'ok';
  if (issues.length === 0 && !addressCandidate && !reverseCandidate) {
    status = 'missing';
  } else if (
    issues.some((issue) =>
      issue.includes('muy separados') ||
      issue.includes('diferencia importante') ||
      issue.includes('No se pudo')
    )
  ) {
    status = 'warning';
  } else if (issues.length > 0) {
    status = 'missing';
  }

  return {
    addressCandidate,
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(3)) : null,
    inputAddress,
    inputLatitude,
    inputLongitude,
    issues,
    reverseCandidate,
    status,
  };
}
