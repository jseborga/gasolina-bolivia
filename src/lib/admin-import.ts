import { haversineKm } from '@/lib/geo';
import { parseMapsInput, resolveMapsInput } from '@/lib/google-maps';
import type {
  StationAdminRow,
  StationImportAction,
  StationImportPreviewItem,
} from '@/lib/admin-types';

const COMMON_STOPWORDS = new Set([
  'av',
  'avenida',
  'calle',
  'de',
  'del',
  'el',
  'en',
  'es',
  'gas',
  'la',
  'los',
  'maps',
  'servicio',
  'station',
  'surtidor',
  'surtidora',
  'y',
]);

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value?: string | null) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

function scoreTokenOverlap(left?: string | null, right?: string | null) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function scoreStringContainment(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 0.88;
  }

  return 0;
}

function scoreField(left?: string | null, right?: string | null) {
  return Math.max(scoreTokenOverlap(left, right), scoreStringContainment(left, right));
}

function cleanUrlCandidate(url: string) {
  return url.replace(/[)\].,;]+$/, '');
}

function extractFirstUrl(input: string) {
  const match = input.match(/https?:\/\/[^\s<>"']+/i);
  return match ? cleanUrlCandidate(match[0]) : '';
}

function splitBulkInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const blocks = trimmed
    .split(/\r?\n\s*\r?\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (blocks.length > 1) return blocks;

  return trimmed
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractNameAndAddress(raw: string, parsedAddress: string) {
  const sourceUrl = extractFirstUrl(raw);
  const withoutUrl = sourceUrl ? raw.replace(sourceUrl, '').trim() : raw.trim();

  if (!withoutUrl) {
    return {
      incomingAddress: parsedAddress,
      incomingName: parsedAddress,
    };
  }

  const pipeParts = withoutUrl
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);

  if (pipeParts.length >= 2) {
    return {
      incomingAddress: pipeParts.slice(1).join(' | '),
      incomingName: pipeParts[0],
    };
  }

  const dashParts = withoutUrl
    .split(/\s+-\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (dashParts.length >= 2 && dashParts[0].length <= 80) {
    return {
      incomingAddress: parsedAddress || dashParts.slice(1).join(' - '),
      incomingName: dashParts[0],
    };
  }

  const lineParts = withoutUrl
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (lineParts.length >= 2) {
    return {
      incomingAddress: parsedAddress || lineParts.slice(1).join(', '),
      incomingName: lineParts[0],
    };
  }

  const commaIndex = withoutUrl.indexOf(',');
  if (commaIndex > 0 && commaIndex < 90) {
    return {
      incomingAddress: parsedAddress || withoutUrl.slice(commaIndex + 1).trim(),
      incomingName: withoutUrl.slice(0, commaIndex).trim(),
    };
  }

  return {
    incomingAddress: parsedAddress,
    incomingName: withoutUrl,
  };
}

function getDistanceKm(
  station: StationAdminRow,
  incomingLatitude: number | null,
  incomingLongitude: number | null
) {
  if (
    incomingLatitude == null ||
    incomingLongitude == null ||
    station.latitude == null ||
    station.longitude == null
  ) {
    return null;
  }

  return haversineKm(
    station.latitude,
    station.longitude,
    incomingLatitude,
    incomingLongitude
  );
}

function getRecommendedAction(
  overallScore: number,
  nameScore: number,
  addressScore: number,
  distanceKm: number | null
): { action: StationImportAction; reason: string } {
  if (
    overallScore >= 0.82 ||
    (distanceKm != null &&
      distanceKm <= 0.12 &&
      (nameScore >= 0.3 || addressScore >= 0.45))
  ) {
    return {
      action: 'update',
      reason: 'Coincidencia fuerte con estación existente.',
    };
  }

  if (
    overallScore >= 0.58 ||
    (distanceKm != null &&
      distanceKm <= 0.5 &&
      (nameScore >= 0.22 || addressScore >= 0.35))
  ) {
    return {
      action: 'review',
      reason: 'Posible coincidencia. Conviene revisar antes de aplicar.',
    };
  }

  return {
    action: 'create',
    reason: 'No se encontró una coincidencia confiable.',
  };
}

function buildPreviewItemFromResolved(
  raw: string,
  resolved: Awaited<ReturnType<typeof resolveMapsInput>>,
  stations: StationAdminRow[]
): StationImportPreviewItem {
  const { incomingAddress, incomingName } = extractNameAndAddress(raw, resolved.address);

  const rankedMatches = stations
    .map((station) => {
      const distanceKm = getDistanceKm(
        station,
        resolved.latitude,
        resolved.longitude
      );
      const nameScore = scoreField(incomingName, station.name);
      const addressScore = scoreField(
        incomingAddress || resolved.address,
        [station.address, station.zone, station.city].filter(Boolean).join(' ')
      );

      let overallScore = nameScore * 0.62 + addressScore * 0.38;

      if (distanceKm != null) {
        if (distanceKm <= 0.08) overallScore += 0.28;
        else if (distanceKm <= 0.2) overallScore += 0.18;
        else if (distanceKm <= 0.5) overallScore += 0.1;
        else if (distanceKm >= 2) overallScore -= 0.08;
      }

      return {
        station,
        overallScore: Math.max(0, Math.min(1, overallScore)),
        nameScore,
        addressScore,
        distanceKm,
      };
    })
    .sort((left, right) => right.overallScore - left.overallScore);

  const bestMatch = rankedMatches[0];
  const recommendation = bestMatch
    ? getRecommendedAction(
        bestMatch.overallScore,
        bestMatch.nameScore,
        bestMatch.addressScore,
        bestMatch.distanceKm
      )
    : {
        action: 'create' as const,
        reason: 'No hay estaciones para comparar.',
      };

  return {
    raw,
    incomingAddress: incomingAddress || resolved.address,
    incomingLatitude: resolved.latitude,
    incomingLongitude: resolved.longitude,
    incomingName: incomingName || resolved.address || raw,
    match: bestMatch
      ? {
          id: bestMatch.station.id,
          name: bestMatch.station.name,
          address: bestMatch.station.address,
          city: bestMatch.station.city,
          zone: bestMatch.station.zone,
          latitude: bestMatch.station.latitude,
          longitude: bestMatch.station.longitude,
          source_url: bestMatch.station.source_url,
        }
      : null,
    matchScore: bestMatch ? Number(bestMatch.overallScore.toFixed(3)) : 0,
    nameScore: bestMatch ? Number(bestMatch.nameScore.toFixed(3)) : 0,
    addressScore: bestMatch ? Number(bestMatch.addressScore.toFixed(3)) : 0,
    distanceKm:
      bestMatch?.distanceKm != null ? Number(bestMatch.distanceKm.toFixed(3)) : null,
    reason: recommendation.reason,
    recommendedAction: recommendation.action,
    sourceUrl: resolved.sourceUrl,
  };
}

export async function buildStationImportPreview(
  input: string,
  stations: StationAdminRow[],
  maxItems = 20
) {
  const entries = splitBulkInput(input);
  const limitedEntries = entries.slice(0, maxItems);
  const items: StationImportPreviewItem[] = [];

  for (const raw of limitedEntries) {
    const fastParsed = parseMapsInput(raw);
    const resolved =
      fastParsed.sourceUrl || fastParsed.latitude == null || fastParsed.longitude == null
        ? await resolveMapsInput(raw)
        : fastParsed;

    items.push(buildPreviewItemFromResolved(raw, resolved, stations));
  }

  return {
    items,
    totalEntries: entries.length,
    truncated: entries.length > limitedEntries.length,
  };
}
