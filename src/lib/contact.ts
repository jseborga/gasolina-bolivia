function normalizeDigits(value?: string | null) {
  return (value ?? '').replace(/[^\d]/g, '');
}

export function buildTelHref(phone?: string | null) {
  const digits = normalizeDigits(phone);
  return digits ? `tel:${digits}` : '';
}

export function buildWhatsAppHref(phone?: string | null) {
  const digits = normalizeDigits(phone);
  return digits ? `https://wa.me/${digits}` : '';
}

export function formatContactLabel(phone?: string | null) {
  const trimmed = phone?.trim();
  return trimmed || 'Sin contacto';
}
