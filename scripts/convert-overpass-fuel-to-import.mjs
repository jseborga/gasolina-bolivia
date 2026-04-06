import fs from 'node:fs/promises';
import path from 'node:path';

function printHelp() {
  console.log(`Uso:
  node scripts/convert-overpass-fuel-to-import.mjs --input <archivo.json> [--output <archivo.txt>] [--json-output <archivo.json>] [--department "Santa Cruz"] [--country "Bolivia"]

Ejemplo:
  node scripts/convert-overpass-fuel-to-import.mjs --input data/santa-cruz-overpass.json --department "Santa Cruz"
`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--')
      ? argv[++index]
      : 'true';

    args[key] = value;
  }

  return args;
}

function unique(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function pickCoordinate(element, key) {
  const direct = element?.[key];
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const center = element?.center?.[key];
  if (typeof center === 'number' && Number.isFinite(center)) return center;

  return null;
}

function pickTag(tags, keys) {
  for (const key of keys) {
    const value = tags?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function pickBooleanTag(tags, keys) {
  for (const key of keys) {
    const value = String(tags?.[key] ?? '').trim().toLowerCase();
    if (!value) continue;
    if (['yes', 'true', '1'].includes(value)) return true;
    if (['no', 'false', '0'].includes(value)) return false;
  }

  return false;
}

function buildAddress(tags, department, country) {
  const street = unique([
    [pickTag(tags, ['addr:street']), pickTag(tags, ['addr:housenumber'])].filter(Boolean).join(' '),
    pickTag(tags, ['addr:full']),
  ])[0] || '';

  const zone = pickTag(tags, ['addr:suburb', 'addr:neighbourhood', 'addr:quarter']);
  const city = pickTag(tags, ['addr:city', 'addr:town', 'addr:village', 'addr:municipality']);
  const state = pickTag(tags, ['addr:state']) || department;
  const nation = pickTag(tags, ['addr:country']) || country;

  const parts = unique([street, zone, city, state, nation]);
  return parts.join(', ');
}

function deriveFuelFlags(tags) {
  const diesel = pickBooleanTag(tags, ['fuel:diesel']);
  const gnv = pickBooleanTag(tags, ['fuel:cng', 'fuel:lng', 'fuel:lpg']);
  const premium = pickBooleanTag(tags, [
    'fuel:octane_97',
    'fuel:octane_98',
    'fuel:octane_100',
    'fuel:premium',
  ]);
  const especial = pickBooleanTag(tags, [
    'fuel:octane_91',
    'fuel:octane_92',
    'fuel:octane_95',
    'fuel:gasoline',
    'fuel:petrol',
  ]);

  return {
    fuel_diesel: diesel,
    fuel_especial: especial || (!diesel && !premium && !gnv),
    fuel_gnv: gnv,
    fuel_premium: premium,
  };
}

function buildProductsText(fuels) {
  const labels = [];
  if (fuels.fuel_especial) labels.push('GE');
  if (fuels.fuel_premium) labels.push('GP');
  if (fuels.fuel_diesel) labels.push('DO');
  if (fuels.fuel_gnv) labels.push('GNV');
  return labels.join(', ');
}

function normalizeElement(element, defaults) {
  const tags = element?.tags ?? {};
  const latitude = pickCoordinate(element, 'lat');
  const longitude = pickCoordinate(element, 'lon');

  if (latitude == null || longitude == null) return null;

  const name =
    pickTag(tags, ['name', 'brand', 'operator']) ||
    `Estacion de servicio ${element.type ?? 'osm'} ${element.id ?? ''}`.trim();

  const city =
    pickTag(tags, ['addr:city', 'addr:town', 'addr:village', 'addr:municipality']) ||
    '';
  const zone = pickTag(tags, ['addr:suburb', 'addr:neighbourhood', 'addr:quarter']);
  const address = buildAddress(tags, defaults.department, defaults.country);
  const fuels = deriveFuelFlags(tags);
  const products = buildProductsText(fuels);
  const brand = pickTag(tags, ['brand']);
  const operator = pickTag(tags, ['operator']);
  const googleQuery = unique([
    name,
    address,
    city || defaults.department,
    defaults.country,
  ]).join(', ');

  return {
    osm_id: element.id ?? null,
    osm_type: element.type ?? null,
    name,
    brand: brand || null,
    operator: operator || null,
    city: city || null,
    zone: zone || null,
    address: address || null,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    fuel_especial: fuels.fuel_especial,
    fuel_premium: fuels.fuel_premium,
    fuel_diesel: fuels.fuel_diesel,
    fuel_gnv: fuels.fuel_gnv,
    products: products || null,
    google_query: googleQuery,
    import_line: `${name} | ${address || defaults.department || defaults.country} | ${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    raw_tags: tags,
  };
}

function dedupeStations(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = [
      item.name.trim().toLowerCase(),
      item.latitude.toFixed(6),
      item.longitude.toFixed(6),
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true') {
    printHelp();
    process.exit(0);
  }

  if (!args.input) {
    printHelp();
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const inputRaw = await fs.readFile(inputPath, 'utf8');
  const payload = JSON.parse(inputRaw);

  if (!Array.isArray(payload?.elements)) {
    throw new Error('El archivo no parece ser una respuesta JSON de Overpass API. Falta "elements".');
  }

  const defaults = {
    country: args.country || 'Bolivia',
    department: args.department || '',
  };

  const normalized = dedupeStations(
    payload.elements
      .map((element) => normalizeElement(element, defaults))
      .filter(Boolean)
  );

  const baseName = inputPath.replace(/\.[^.]+$/, '');
  const outputPath = path.resolve(process.cwd(), args.output || `${baseName}.station-import.txt`);
  const jsonOutputPath = path.resolve(
    process.cwd(),
    args['json-output'] || `${baseName}.normalized.json`
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(jsonOutputPath), { recursive: true });

  await fs.writeFile(
    outputPath,
    normalized.map((item) => item.import_line).join('\n') + '\n',
    'utf8'
  );

  await fs.writeFile(jsonOutputPath, JSON.stringify(normalized, null, 2), 'utf8');

  console.log(`OK: ${normalized.length} estaciones normalizadas.`);
  console.log(`TXT para importar: ${outputPath}`);
  console.log(`JSON normalizado: ${jsonOutputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
