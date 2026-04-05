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

function normalizeRating(
  value: number | null | undefined,
  type: 'score' | 'count'
) {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(type === 'score' ? 'La reputación no es válida.' : 'La cantidad de reseñas no es válida.');
  }

  if (type === 'score') {
    if (value < 0 || value > 5) {
      throw new Error('La reputación debe estar entre 0 y 5.');
    }
    return Number(value.toFixed(1));
  }

  if (value < 0) {
    throw new Error('La cantidad de reseñas no puede ser negativa.');
  }

  return Math.round(value);
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
  const ratingScore = normalizeRating(body.rating_score ?? null, 'score');
  const ratingCount = normalizeRating(body.rating_count ?? null, 'count');

  if ((latitude == null) !== (longitude == null)) {
    throw new Error('Debes completar latitud y longitud juntas.');
  }

  return {
    address: normalizeText(body.address),
    category: body.category,
    city: normalizeText(body.city),
    description: normalizeText(body.description),
    is_active: body.is_active ?? true,
    is_published: body.is_published ?? false,
    is_verified: body.is_verified ?? false,
    latitude,
    longitude,
    meeting_point: normalizeText(body.meeting_point),
    name,
    notes: normalizeText(body.notes),
    phone: normalizeText(body.phone),
    price_text: normalizeText(body.price_text),
    rating_count: ratingCount ?? 0,
    rating_score: ratingScore ?? 0,
    source_url: normalizeText(body.source_url),
    website_url: normalizeText(body.website_url),
    whatsapp_number: normalizeText(body.whatsapp_number),
    zone: normalizeText(body.zone),
  };
}
