import type { ServiceAdminRow } from "@/lib/admin-service-types";
import type { StationImportAction, StationAdminRow } from "@/lib/admin-types";
import type {
  OSMImportPreviewItem,
  OSMImportPreviewResponse,
  OSMImportRequest,
  OSMImportSourceMeta,
  OSMServicePreviewPayload,
  OSMStationPreviewPayload,
} from "@/lib/admin-osm-types";
import { haversineKm } from "@/lib/geo";
import type { SupportServiceCategory } from "@/lib/types";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
const NOMINATIM_ENDPOINT =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";

const COMMON_STOPWORDS = new Set([
  "av",
  "avenida",
  "calle",
  "de",
  "del",
  "el",
  "en",
  "es",
  "gas",
  "la",
  "los",
  "maps",
  "servicio",
  "station",
  "surtidor",
  "surtidora",
  "taller",
  "grua",
  "grúa",
  "auxilio",
  "mecanico",
  "mecánico",
  "y",
]);

type OverpassElement = {
  center?: { lat?: number; lon?: number };
  id?: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  type?: string;
};

type SearchBounds = {
  east: number;
  north: number;
  south: number;
  west: number;
};

type NominatimSearchResult = {
  addresstype?: string;
  boundingbox?: string[];
  class?: string;
  display_name?: string;
  importance?: number;
  osm_type?: string;
  type?: string;
};

type BaseCandidate = {
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  raw: string;
  sourceMeta: OSMImportSourceMeta;
  sourceUrl: string;
  target: "stations" | "services";
  zone: string;
};

type StationCandidate = BaseCandidate & {
  stationPayload: OSMStationPreviewPayload;
};

type ServiceCandidate = BaseCandidate & {
  servicePayload: OSMServicePreviewPayload;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value?: string | null) {
  return normalizeText(value)
    .split(" ")
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
      action: "update",
      reason: "Coincidencia fuerte con un registro existente.",
    };
  }

  if (
    overallScore >= 0.58 ||
    (distanceKm != null &&
      distanceKm <= 0.5 &&
      (nameScore >= 0.22 || addressScore >= 0.35))
  ) {
    return {
      action: "review",
      reason: "Posible coincidencia. Conviene revisar antes de aplicar.",
    };
  }

  return {
    action: "create",
    reason: "No se encontró una coincidencia confiable.",
  };
}

function toNumber(value?: number | string | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickCoordinate(element: OverpassElement, key: "lat" | "lon") {
  const direct = toNumber(element[key]);
  if (direct != null) return direct;

  const center = toNumber(element.center?.[key]);
  if (center != null) return center;

  return null;
}

function pickTag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickBooleanTag(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = String(tags[key] ?? "").trim().toLowerCase();
    if (!value) continue;
    if (["yes", "true", "1"].includes(value)) return true;
    if (["no", "false", "0"].includes(value)) return false;
  }

  return false;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "accept-language": "es",
      "user-agent": "SurtiMapaAdmin/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Error resolviendo área OSM: ${response.status}`);
  }

  return response.json();
}

function getCountryCode(country: string) {
  const normalized = normalizeText(country);
  if (normalized === "bolivia") return "bo";
  return "";
}

function parseBoundingBox(value?: string[]) {
  if (!Array.isArray(value) || value.length < 4) return null;

  const south = toNumber(value[0]);
  const north = toNumber(value[1]);
  const west = toNumber(value[2]);
  const east = toNumber(value[3]);

  if (south == null || north == null || west == null || east == null) {
    return null;
  }

  return { south, north, west, east };
}

function pickSearchResult(results: NominatimSearchResult[]) {
  const ranked = [...results].sort((left, right) => {
    const leftAdministrative =
      left.class === "boundary" || left.type === "administrative" || left.addresstype === "state";
    const rightAdministrative =
      right.class === "boundary" || right.type === "administrative" || right.addresstype === "state";

    if (leftAdministrative !== rightAdministrative) {
      return leftAdministrative ? -1 : 1;
    }

    return (right.importance ?? 0) - (left.importance ?? 0);
  });

  return ranked[0] ?? null;
}

async function resolveSearchBounds(request: OSMImportRequest): Promise<SearchBounds> {
  const query = new URLSearchParams({
    format: "jsonv2",
    limit: "10",
    q: `${request.department}, ${request.country ?? "Bolivia"}`,
  });

  const countryCode = getCountryCode(request.country ?? "Bolivia");
  if (countryCode) {
    query.set("countrycodes", countryCode);
  }

  const json = (await fetchJson(
    `${NOMINATIM_ENDPOINT}/search?${query.toString()}`
  )) as NominatimSearchResult[];

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error("No se pudo ubicar el área solicitada en OpenStreetMap.");
  }

  const candidate = pickSearchResult(json);
  const bounds = parseBoundingBox(candidate?.boundingbox);

  if (!candidate || !bounds) {
    throw new Error("OpenStreetMap no devolvió un área válida para la búsqueda.");
  }

  return bounds;
}

function buildAddress(
  tags: Record<string, string>,
  department: string,
  country: string
) {
  const street = unique([
    [pickTag(tags, ["addr:street"]), pickTag(tags, ["addr:housenumber"])]
      .filter(Boolean)
      .join(" "),
    pickTag(tags, ["addr:full"]),
  ])[0] || "";

  const zone = pickTag(tags, ["addr:suburb", "addr:neighbourhood", "addr:quarter"]);
  const city = pickTag(tags, ["addr:city", "addr:town", "addr:village", "addr:municipality"]);
  const state = pickTag(tags, ["addr:state"]) || department;
  const nation = pickTag(tags, ["addr:country"]) || country;

  return unique([street, zone, city, state, nation]).join(", ");
}

function deriveFuelFlags(tags: Record<string, string>) {
  const fuel_diesel = pickBooleanTag(tags, ["fuel:diesel"]);
  const fuel_gnv = pickBooleanTag(tags, ["fuel:cng", "fuel:lng", "fuel:lpg"]);
  const fuel_premium = pickBooleanTag(tags, [
    "fuel:octane_97",
    "fuel:octane_98",
    "fuel:octane_100",
    "fuel:premium",
  ]);
  const fuel_especial = pickBooleanTag(tags, [
    "fuel:octane_91",
    "fuel:octane_92",
    "fuel:octane_95",
    "fuel:gasoline",
    "fuel:petrol",
  ]);

  return {
    fuel_diesel,
    fuel_especial: fuel_especial || (!fuel_diesel && !fuel_premium && !fuel_gnv),
    fuel_gnv,
    fuel_premium,
  };
}

function buildProductsText(fuels: ReturnType<typeof deriveFuelFlags>) {
  const labels: string[] = [];
  if (fuels.fuel_especial) labels.push("GE");
  if (fuels.fuel_premium) labels.push("GP");
  if (fuels.fuel_diesel) labels.push("DO");
  if (fuels.fuel_gnv) labels.push("GNV");
  return labels.join(", ");
}

function buildSourceUrl(element: OverpassElement) {
  if (!element.type || element.id == null) return "";
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function buildRawLine(name: string, address: string, latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return `${name} | ${address}`;
  }

  return `${name} | ${address} | ${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

function buildStationCandidate(
  element: OverpassElement,
  request: OSMImportRequest
): StationCandidate | null {
  const tags = element.tags ?? {};
  const latitude = pickCoordinate(element, "lat");
  const longitude = pickCoordinate(element, "lon");

  if (latitude == null || longitude == null) return null;

  const name =
    pickTag(tags, ["name", "brand", "operator"]) ||
    `Estacion de servicio OSM ${element.id ?? ""}`.trim();
  const city =
    pickTag(tags, ["addr:city", "addr:town", "addr:village", "addr:municipality"]) ||
    request.department;
  const zone = pickTag(tags, ["addr:suburb", "addr:neighbourhood", "addr:quarter"]);
  const address = buildAddress(tags, request.department, request.country ?? "Bolivia");
  const fuels = deriveFuelFlags(tags);
  const products = buildProductsText(fuels);
  const brand = pickTag(tags, ["brand"]);
  const operator = pickTag(tags, ["operator"]);
  const sourceUrl = buildSourceUrl(element);
  const notesParts = unique([
    "Importada desde OpenStreetMap.",
    brand ? `Marca: ${brand}` : "",
    operator ? `Operador: ${operator}` : "",
    products ? `Productos OSM: ${products}` : "",
  ]);

  return {
    address,
    city,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    name,
    raw: buildRawLine(name, address, latitude, longitude),
    sourceMeta: {
      brand: brand || null,
      operator: operator || null,
      osm_id: element.id ?? null,
      osm_type: element.type ?? null,
      products: products || null,
    },
    sourceUrl,
    stationPayload: {
      address,
      city,
      fuel_diesel: fuels.fuel_diesel,
      fuel_especial: fuels.fuel_especial,
      fuel_gnv: fuels.fuel_gnv,
      fuel_premium: fuels.fuel_premium,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      name,
      notes: notesParts.join(" "),
      source_url: sourceUrl,
      zone,
    },
    target: "stations",
    zone,
  };
}

function buildServiceCandidate(
  element: OverpassElement,
  request: OSMImportRequest
): ServiceCandidate | null {
  const tags = element.tags ?? {};
  const latitude = pickCoordinate(element, "lat");
  const longitude = pickCoordinate(element, "lon");

  if (latitude == null || longitude == null || !request.serviceCategory) return null;

  const name =
    pickTag(tags, ["name", "brand", "operator"]) ||
    `${request.serviceCategory} OSM ${element.id ?? ""}`.trim();
  const city =
    pickTag(tags, ["addr:city", "addr:town", "addr:village", "addr:municipality"]) ||
    request.department;
  const zone = pickTag(tags, ["addr:suburb", "addr:neighbourhood", "addr:quarter"]);
  const address = buildAddress(tags, request.department, request.country ?? "Bolivia");
  const brand = pickTag(tags, ["brand"]);
  const operator = pickTag(tags, ["operator"]);
  const phone = pickTag(tags, ["contact:phone", "phone"]);
  const website = pickTag(tags, ["contact:website", "website", "url"]);
  const whatsapp = pickTag(tags, ["contact:whatsapp", "whatsapp"]);
  const sourceUrl = buildSourceUrl(element);
  const description = unique([
    pickTag(tags, ["description"]),
    brand ? `Marca: ${brand}` : "",
    operator ? `Operador: ${operator}` : "",
  ]).join(" | ");
  const notes = unique([
    "Importado desde OpenStreetMap.",
    tags["opening_hours"] ? `Horarios: ${tags["opening_hours"]}` : "",
    tags["service:vehicle:towing"] ? `Towing: ${tags["service:vehicle:towing"]}` : "",
  ]).join(" ");

  return {
    address,
    city,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    name,
    raw: buildRawLine(name, address, latitude, longitude),
    servicePayload: {
      address,
      category: request.serviceCategory,
      city,
      description: description || undefined,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      meeting_point: undefined,
      name,
      notes: notes || undefined,
      phone: phone || undefined,
      price_text: undefined,
      source_url: sourceUrl,
      website_url: website || undefined,
      whatsapp_number: whatsapp || phone || undefined,
      zone,
    },
    sourceMeta: {
      brand: brand || null,
      operator: operator || null,
      osm_id: element.id ?? null,
      osm_type: element.type ?? null,
      phone: phone || whatsapp || null,
      website_url: website || null,
    },
    sourceUrl,
    target: "services",
    zone,
  };
}

function dedupeCandidates<T extends BaseCandidate>(items: T[]) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = [
      normalizeText(item.name),
      item.latitude?.toFixed(6) ?? "",
      item.longitude?.toFixed(6) ?? "",
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function buildServiceNote(category: SupportServiceCategory | undefined) {
  switch (category) {
    case "grua":
      return "La categoría grúa en OSM es heurística y puede traer falsos positivos. Revisa antes de aplicar.";
    case "servicio_mecanico":
      return "Auxilio mecánico en OSM no está estandarizado; la búsqueda usa nombres y tags aproximados.";
    case "aditivos":
      return "Aditivos en OSM se aproxima con tiendas de repuestos y nombres relacionados. Requiere revisión.";
    default:
      return undefined;
  }
}

export function buildOverpassQuery(request: OSMImportRequest) {
  const location = `${request.department}, ${request.country ?? "Bolivia"}`;

  if (request.target === "stations") {
    return `
[out:json][timeout:120];
{{geocodeArea:${location}}}->.searchArea;

(
  node["amenity"="fuel"](area.searchArea);
  way["amenity"="fuel"](area.searchArea);
  relation["amenity"="fuel"](area.searchArea);
);

out center tags;
`.trim();
  }

  switch (request.serviceCategory) {
    case "taller_mecanico":
      return `
[out:json][timeout:120];
{{geocodeArea:${location}}}->.searchArea;

(
  node["shop"="car_repair"](area.searchArea);
  way["shop"="car_repair"](area.searchArea);
  relation["shop"="car_repair"](area.searchArea);
  node["craft"="car_repair"](area.searchArea);
  way["craft"="car_repair"](area.searchArea);
  relation["craft"="car_repair"](area.searchArea);
);

out center tags;
`.trim();
    case "grua":
      return `
[out:json][timeout:120];
{{geocodeArea:${location}}}->.searchArea;

(
  node["service:vehicle:towing"="yes"](area.searchArea);
  way["service:vehicle:towing"="yes"](area.searchArea);
  relation["service:vehicle:towing"="yes"](area.searchArea);
  node["amenity"="towing"](area.searchArea);
  way["amenity"="towing"](area.searchArea);
  relation["amenity"="towing"](area.searchArea);
  node["name"~"(grua|grúa|tow|remolque)",i](area.searchArea);
  way["name"~"(grua|grúa|tow|remolque)",i](area.searchArea);
  relation["name"~"(grua|grúa|tow|remolque)",i](area.searchArea);
);

out center tags;
`.trim();
    case "servicio_mecanico":
      return `
[out:json][timeout:120];
{{geocodeArea:${location}}}->.searchArea;

(
  node["shop"="car_repair"](area.searchArea);
  way["shop"="car_repair"](area.searchArea);
  relation["shop"="car_repair"](area.searchArea);
  node["service:vehicle:repair"="yes"](area.searchArea);
  way["service:vehicle:repair"="yes"](area.searchArea);
  relation["service:vehicle:repair"="yes"](area.searchArea);
  node["name"~"(auxilio|mecanico|mecánico|movil|móvil)",i](area.searchArea);
  way["name"~"(auxilio|mecanico|mecánico|movil|móvil)",i](area.searchArea);
  relation["name"~"(auxilio|mecanico|mecánico|movil|móvil)",i](area.searchArea);
);

out center tags;
`.trim();
    case "aditivos":
      return `
[out:json][timeout:120];
{{geocodeArea:${location}}}->.searchArea;

(
  node["shop"="car_parts"](area.searchArea);
  way["shop"="car_parts"](area.searchArea);
  relation["shop"="car_parts"](area.searchArea);
  node["name"~"(aditivo|lubricante|aceite)",i](area.searchArea);
  way["name"~"(aditivo|lubricante|aceite)",i](area.searchArea);
  relation["name"~"(aditivo|lubricante|aceite)",i](area.searchArea);
);

out center tags;
`.trim();
    default:
      throw new Error("La categoría de servicio OSM no es válida.");
  }
}

function buildBBoxHeader(bounds: SearchBounds) {
  return `[out:json][timeout:120][bbox:${bounds.south},${bounds.west},${bounds.north},${bounds.east}];`;
}

export async function buildResolvedOverpassQuery(request: OSMImportRequest) {
  const bounds = await resolveSearchBounds(request);
  const header = buildBBoxHeader(bounds);

  if (request.target === "stations") {
    return `
${header}

(
  node["amenity"="fuel"];
  way["amenity"="fuel"];
  relation["amenity"="fuel"];
);

out center tags;
`.trim();
  }

  switch (request.serviceCategory) {
    case "taller_mecanico":
      return `
${header}

(
  node["shop"="car_repair"];
  way["shop"="car_repair"];
  relation["shop"="car_repair"];
  node["craft"="car_repair"];
  way["craft"="car_repair"];
  relation["craft"="car_repair"];
);

out center tags;
`.trim();
    case "grua":
      return `
${header}

(
  node["service:vehicle:towing"="yes"];
  way["service:vehicle:towing"="yes"];
  relation["service:vehicle:towing"="yes"];
  node["amenity"="towing"];
  way["amenity"="towing"];
  relation["amenity"="towing"];
  node["name"~"(grua|grÃºa|tow|remolque)",i];
  way["name"~"(grua|grÃºa|tow|remolque)",i];
  relation["name"~"(grua|grÃºa|tow|remolque)",i];
);

out center tags;
`.trim();
    case "servicio_mecanico":
      return `
${header}

(
  node["shop"="car_repair"];
  way["shop"="car_repair"];
  relation["shop"="car_repair"];
  node["service:vehicle:repair"="yes"];
  way["service:vehicle:repair"="yes"];
  relation["service:vehicle:repair"="yes"];
  node["name"~"(auxilio|mecanico|mecÃ¡nico|movil|mÃ³vil)",i];
  way["name"~"(auxilio|mecanico|mecÃ¡nico|movil|mÃ³vil)",i];
  relation["name"~"(auxilio|mecanico|mecÃ¡nico|movil|mÃ³vil)",i];
);

out center tags;
`.trim();
    case "aditivos":
      return `
${header}

(
  node["shop"="car_parts"];
  way["shop"="car_parts"];
  relation["shop"="car_parts"];
  node["name"~"(aditivo|lubricante|aceite)",i];
  way["name"~"(aditivo|lubricante|aceite)",i];
  relation["name"~"(aditivo|lubricante|aceite)",i];
);

out center tags;
`.trim();
    default:
      throw new Error("La categorÃ­a de servicio OSM no es vÃ¡lida.");
  }
}

export async function fetchOverpassElements(query: string) {
  const response = await fetch(OVERPASS_ENDPOINT, {
    body: query,
    cache: "no-store",
    headers: {
      "content-type": "text/plain;charset=UTF-8",
    },
    method: "POST",
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    throw new Error(`Overpass respondió ${response.status}.`);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  return Array.isArray(payload.elements) ? payload.elements : [];
}

function getDistanceKm(
  latitude: number | null,
  longitude: number | null,
  otherLatitude: number | null,
  otherLongitude: number | null
) {
  if (
    latitude == null ||
    longitude == null ||
    otherLatitude == null ||
    otherLongitude == null
  ) {
    return null;
  }

  return haversineKm(latitude, longitude, otherLatitude, otherLongitude);
}

function toPreviewItem(
  candidate: StationCandidate,
  stations: StationAdminRow[]
): OSMImportPreviewItem {
  const rankedMatches = stations
    .map((station) => {
      const distanceKm = getDistanceKm(
        candidate.latitude,
        candidate.longitude,
        station.latitude,
        station.longitude
      );
      const nameScore = scoreField(candidate.name, station.name);
      const addressScore = scoreField(
        candidate.address,
        [station.address, station.zone, station.city].filter(Boolean).join(" ")
      );

      let overallScore = nameScore * 0.62 + addressScore * 0.38;
      if (distanceKm != null) {
        if (distanceKm <= 0.08) overallScore += 0.28;
        else if (distanceKm <= 0.2) overallScore += 0.18;
        else if (distanceKm <= 0.5) overallScore += 0.1;
        else if (distanceKm >= 2) overallScore -= 0.08;
      }

      return {
        addressScore,
        distanceKm,
        nameScore,
        overallScore: Math.max(0, Math.min(1, overallScore)),
        station,
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
    : { action: "create" as const, reason: "No hay estaciones para comparar." };

  return {
    distanceKm:
      bestMatch?.distanceKm != null ? Number(bestMatch.distanceKm.toFixed(3)) : null,
    incomingAddress: candidate.address,
    incomingCity: candidate.city,
    incomingLatitude: candidate.latitude,
    incomingLongitude: candidate.longitude,
    incomingName: candidate.name,
    incomingZone: candidate.zone,
    match: bestMatch
      ? {
          address: bestMatch.station.address,
          city: bestMatch.station.city,
          id: bestMatch.station.id,
          latitude: bestMatch.station.latitude,
          longitude: bestMatch.station.longitude,
          name: bestMatch.station.name,
          source_url: bestMatch.station.source_url,
          zone: bestMatch.station.zone,
        }
      : null,
    matchScore: bestMatch ? Number(bestMatch.overallScore.toFixed(3)) : 0,
    addressScore: bestMatch ? Number(bestMatch.addressScore.toFixed(3)) : 0,
    nameScore: bestMatch ? Number(bestMatch.nameScore.toFixed(3)) : 0,
    raw: candidate.raw,
    reason: recommendation.reason,
    recommendedAction: recommendation.action,
    sourceMeta: candidate.sourceMeta,
    sourceUrl: candidate.sourceUrl,
    stationPayload: candidate.stationPayload,
    target: "stations",
  };
}

function toServicePreviewItem(
  candidate: ServiceCandidate,
  services: ServiceAdminRow[]
): OSMImportPreviewItem {
  const comparableServices = services.filter(
    (service) => service.category === candidate.servicePayload.category
  );

  const rankedMatches = comparableServices
    .map((service) => {
      const distanceKm = getDistanceKm(
        candidate.latitude,
        candidate.longitude,
        service.latitude,
        service.longitude
      );
      const nameScore = scoreField(candidate.name, service.name);
      const addressScore = scoreField(
        candidate.address,
        [service.address, service.zone, service.city].filter(Boolean).join(" ")
      );

      let overallScore = nameScore * 0.65 + addressScore * 0.35;
      if (distanceKm != null) {
        if (distanceKm <= 0.08) overallScore += 0.26;
        else if (distanceKm <= 0.2) overallScore += 0.18;
        else if (distanceKm <= 0.5) overallScore += 0.08;
        else if (distanceKm >= 2) overallScore -= 0.08;
      }

      return {
        addressScore,
        distanceKm,
        nameScore,
        overallScore: Math.max(0, Math.min(1, overallScore)),
        service,
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
    : { action: "create" as const, reason: "No hay servicios comparables para revisar." };

  return {
    actionHint: buildServiceNote(candidate.servicePayload.category),
    distanceKm:
      bestMatch?.distanceKm != null ? Number(bestMatch.distanceKm.toFixed(3)) : null,
    incomingAddress: candidate.address,
    incomingCity: candidate.city,
    incomingLatitude: candidate.latitude,
    incomingLongitude: candidate.longitude,
    incomingName: candidate.name,
    incomingZone: candidate.zone,
    match: bestMatch
      ? {
          address: bestMatch.service.address,
          city: bestMatch.service.city,
          id: bestMatch.service.id,
          latitude: bestMatch.service.latitude,
          longitude: bestMatch.service.longitude,
          name: bestMatch.service.name,
          source_url: bestMatch.service.source_url,
          zone: bestMatch.service.zone,
        }
      : null,
    matchScore: bestMatch ? Number(bestMatch.overallScore.toFixed(3)) : 0,
    addressScore: bestMatch ? Number(bestMatch.addressScore.toFixed(3)) : 0,
    nameScore: bestMatch ? Number(bestMatch.nameScore.toFixed(3)) : 0,
    raw: candidate.raw,
    reason: recommendation.reason,
    recommendedAction: recommendation.action,
    servicePayload: candidate.servicePayload,
    sourceMeta: candidate.sourceMeta,
    sourceUrl: candidate.sourceUrl,
    target: "services",
  };
}

export async function buildOSMImportPreview(
  request: OSMImportRequest,
  stations: StationAdminRow[],
  services: ServiceAdminRow[],
  maxItems = 80
): Promise<OSMImportPreviewResponse> {
  const query = await buildResolvedOverpassQuery(request);
  const elements = await fetchOverpassElements(query);

  if (request.target === "stations") {
    const normalized = dedupeCandidates(
      elements
        .map((element) => buildStationCandidate(element, request))
        .filter(Boolean) as StationCandidate[]
    );
    const limitedItems = normalized.slice(0, maxItems).map((item) => toPreviewItem(item, stations));

    return {
      fetchedCount: elements.length,
      items: limitedItems,
      note: null,
      query,
      totalEntries: normalized.length,
      truncated: normalized.length > limitedItems.length,
    };
  }

  const normalized = dedupeCandidates(
    elements
      .map((element) => buildServiceCandidate(element, request))
      .filter(Boolean) as ServiceCandidate[]
  );
  const limitedItems = normalized
    .slice(0, maxItems)
    .map((item) => toServicePreviewItem(item, services));

  return {
    fetchedCount: elements.length,
    items: limitedItems,
    note: buildServiceNote(request.serviceCategory) ?? null,
    query,
    totalEntries: normalized.length,
    truncated: normalized.length > limitedItems.length,
  };
}
