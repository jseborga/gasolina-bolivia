import type { StationAdminInput } from '@/lib/admin-types';

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCoordinate(
  value: number | null | undefined,
  type: 'latitude' | 'longitude'
) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(type === 'latitude' ? 'La latitud no es válida.' : 'La longitud no es válida.');
  }

  if (type === 'latitude' && (value < -90 || value > 90)) {
    throw new Error('La latitud debe estar entre -90 y 90.');
  }

  if (type === 'longitude' && (value < -180 || value > 180)) {
    throw new Error('La longitud debe estar entre -180 y 180.');
  }

  return Number(value.toFixed(6));
}

export function normalizeStationAdminInput(body: StationAdminInput) {
  const name = body.name?.trim();
  if (!name) {
    throw new Error('El nombre es obligatorio.');
  }

  const latitude = normalizeCoordinate(body.latitude ?? null, 'latitude');
  const longitude = normalizeCoordinate(body.longitude ?? null, 'longitude');

  if ((latitude == null) !== (longitude == null)) {
    throw new Error('Debes completar latitud y longitud juntas.');
  }

  return {
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    fuel_diesel: body.fuel_diesel ?? false,
    fuel_especial: body.fuel_especial ?? false,
    fuel_gnv: body.fuel_gnv ?? false,
    fuel_premium: body.fuel_premium ?? false,
    is_active: body.is_active ?? true,
    is_verified: body.is_verified ?? false,
    latitude,
    license_code: normalizeText(body.license_code),
    longitude,
    name,
    notes: normalizeText(body.notes),
    source_url: normalizeText(body.source_url),
    zone: normalizeText(body.zone),
  };
}
