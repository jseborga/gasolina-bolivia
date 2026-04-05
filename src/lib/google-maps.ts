export type ParsedMapsInput = {
  latitude: number | null;
  longitude: number | null;
  address: string;
  sourceUrl: string;
};

function toNumber(value?: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractLatLngFromText(input: string): { latitude: number | null; longitude: number | null } {
  const text = input.trim();

  // Caso 1: URL o texto con @lat,lng
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return {
      latitude: toNumber(atMatch[1]),
      longitude: toNumber(atMatch[2]),
    };
  }

  // Caso 2: q=lat,lng o query=lat,lng
  const qMatch = text.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    return {
      latitude: toNumber(qMatch[1]),
      longitude: toNumber(qMatch[2]),
    };
  }

  // Caso 3: texto simple "lat,lng"
  const plainMatch = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (plainMatch) {
    return {
      latitude: toNumber(plainMatch[1]),
      longitude: toNumber(plainMatch[2]),
    };
  }

  return { latitude: null, longitude: null };
}

export function parseMapsInput(input: string): ParsedMapsInput {
  const raw = input.trim();
  const { latitude, longitude } = extractLatLngFromText(raw);

  const isUrl = /^https?:\/\//i.test(raw);

  return {
    latitude,
    longitude,
    address: isUrl ? "" : raw,
    sourceUrl: isUrl ? raw : "",
  };
}
