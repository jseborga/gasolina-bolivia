import type { ServiceAdminInput } from '@/lib/admin-service-types';
import { SUPPORT_SERVICE_OPTIONS } from '@/lib/services';

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

export function normalizeServiceAdminInput(body: ServiceAdminInput) {
  const name = body.name?.trim();
  if (!name) {
    throw new Error('El nombre es obligatorio.');
  }

  if (!SUPPORT_SERVICE_OPTIONS.some((option) => option.value === body.category)) {
    throw new Error('La categoría del servicio no es válida.');
  }

  const latitude = normalizeCoordinate(body.latitude ?? null, 'latitude');
  const longitude = normalizeCoordinate(body.longitude ?? null, 'longitude');

  if ((latitude == null) !== (longitude == null)) {
    throw new Error('Debes completar latitud y longitud juntas.');
  }

  return {
    address: normalizeText(body.address),
    category: body.category,
    city: normalizeText(body.city),
    description: normalizeText(body.description),
    is_active: body.is_active ?? true,
    is_verified: body.is_verified ?? false,
    latitude,
    longitude,
    name,
    notes: normalizeText(body.notes),
    phone: normalizeText(body.phone),
    source_url: normalizeText(body.source_url),
    website_url: normalizeText(body.website_url),
    whatsapp_number: normalizeText(body.whatsapp_number),
    zone: normalizeText(body.zone),
  };
}
