export type ParsedMapsInput = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  matchSource?: 'html' | 'input' | 'none' | 'redirect';
  resolvedUrl?: string;
  sourceUrl: string;
};

function toNumber(value?: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasValidCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function cleanUrlCandidate(url: string) {
  return url.replace(/[)\].,;]+$/, '');
}

function extractFirstUrl(input: string) {
  const match = input.match(/https?:\/\/[^\s<>"']+/i);
  return match ? cleanUrlCandidate(match[0]) : '';
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractLatLngFromPatterns(text: string) {
  const orderedPatterns: Array<{
    pattern: RegExp;
    toCoordinates: (match: RegExpMatchArray) => { latitude: number | null; longitude: number | null };
  }> = [
    {
      pattern: /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      toCoordinates: (match) => ({
        latitude: toNumber(match[1]),
        longitude: toNumber(match[2]),
      }),
    },
    {
      pattern: /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      toCoordinates: (match) => ({
        latitude: toNumber(match[1]),
        longitude: toNumber(match[2]),
      }),
    },
    {
      pattern: /[?&#](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
      toCoordinates: (match) => ({
        latitude: toNumber(match[1]),
        longitude: toNumber(match[2]),
      }),
    },
    {
      pattern:
        /\blat(?:itude)?\b\s*[:=]\s*(-?\d+(?:\.\d+)?)[^\d-]+\bl(?:ng|on|ongitude)\b\s*[:=]\s*(-?\d+(?:\.\d+)?)/i,
      toCoordinates: (match) => ({
        latitude: toNumber(match[1]),
        longitude: toNumber(match[2]),
      }),
    },
    {
      pattern:
        /\bl(?:ng|on|ongitude)\b\s*[:=]\s*(-?\d+(?:\.\d+)?)[^\d-]+\blat(?:itude)?\b\s*[:=]\s*(-?\d+(?:\.\d+)?)/i,
      toCoordinates: (match) => ({
        latitude: toNumber(match[2]),
        longitude: toNumber(match[1]),
      }),
    },
  ];

  for (const { pattern, toCoordinates } of orderedPatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const { latitude, longitude } = toCoordinates(match);

    if (hasValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  const pairMatches = text.matchAll(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/g);
  for (const match of pairMatches) {
    const latitude = toNumber(match[1]);
    const longitude = toNumber(match[2]);
    if (hasValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return { latitude: null, longitude: null };
}

function extractAddressFromUrl(sourceUrl: string) {
  if (!sourceUrl) return '';

  try {
    const url = new URL(sourceUrl);
    const decodedPath = safeDecode(url.pathname).replace(/\+/g, ' ');
    const placeMatch =
      decodedPath.match(/\/(?:maps\/)?place\/([^/]+)/i) ??
      decodedPath.match(/\/(?:maps\/)?search\/([^/]+)/i);

    if (!placeMatch?.[1]) return '';
    return placeMatch[1].replace(/_/g, ' ').trim();
  } catch {
    return '';
  }
}

function extractAddressFromHtml(html: string) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch?.[1]) return '';

  return titleMatch[1]
    .replace(/\s*-\s*Google Maps\s*$/i, '')
    .replace(/&amp;/g, '&')
    .trim();
}

function extractLatLngFromHtml(html: string) {
  const structuredPatterns = [
    /"latitude"\s*:\s*(-?\d+(?:\.\d+)?)[^]{0,120}?"longitude"\s*:\s*(-?\d+(?:\.\d+)?)/i,
    /"lat"\s*:\s*(-?\d+(?:\.\d+)?)[^]{0,120}?"lng"\s*:\s*(-?\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of structuredPatterns) {
    const match = html.match(pattern);
    if (!match) continue;

    const latitude = toNumber(match[1]);
    const longitude = toNumber(match[2]);
    if (hasValidCoordinates(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  const fromText = extractLatLngFromPatterns(html);
  if (hasValidCoordinates(fromText.latitude, fromText.longitude)) {
    return fromText;
  }

  const decodedHtml = safeDecode(html);
  return extractLatLngFromPatterns(decodedHtml);
}

export function parseMapsInput(input: string): ParsedMapsInput {
  const raw = input.trim();
  const sourceUrl = extractFirstUrl(raw);
  const textWithoutUrl = sourceUrl ? raw.replace(sourceUrl, '').trim() : raw;
  const { latitude, longitude } = extractLatLngFromPatterns(raw);
  const address = sourceUrl
    ? textWithoutUrl || extractAddressFromUrl(sourceUrl)
    : raw;

  return {
    address,
    latitude,
    longitude,
    matchSource: hasValidCoordinates(latitude, longitude) ? 'input' : 'none',
    sourceUrl,
  };
}

export async function resolveMapsInput(input: string): Promise<ParsedMapsInput> {
  const parsed = parseMapsInput(input);

  if (hasValidCoordinates(parsed.latitude, parsed.longitude)) {
    return parsed;
  }

  if (!parsed.sourceUrl) {
    return parsed;
  }

  try {
    const response = await fetch(parsed.sourceUrl, {
      cache: 'no-store',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    const resolvedUrl = response.url || parsed.sourceUrl;
    const html = await response.text();
    const fromRedirect = parseMapsInput(resolvedUrl);

    if (hasValidCoordinates(fromRedirect.latitude, fromRedirect.longitude)) {
      return {
        address: parsed.address || fromRedirect.address || extractAddressFromHtml(html),
        latitude: fromRedirect.latitude,
        longitude: fromRedirect.longitude,
        matchSource: 'redirect',
        resolvedUrl,
        sourceUrl: resolvedUrl,
      };
    }

    const fromHtml = extractLatLngFromHtml(html);
    return {
      address:
        parsed.address ||
        fromRedirect.address ||
        extractAddressFromHtml(html) ||
        extractAddressFromUrl(resolvedUrl),
      latitude: fromHtml.latitude,
      longitude: fromHtml.longitude,
      matchSource: hasValidCoordinates(fromHtml.latitude, fromHtml.longitude)
        ? 'html'
        : 'none',
      resolvedUrl,
      sourceUrl: resolvedUrl,
    };
  } catch {
    return parsed;
  }
}
