#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = process.cwd();
const TRACKER_EUI = process.env.SENSECAP_DEVICE_EUI ?? '2CF7F1C08150015A';
const SENSECAP_BASE = process.env.SENSECAP_BASE_URL ?? 'https://sensecap.seeed.cc/openapi';
const NOMINATIM_URL =
  process.env.NOMINATIM_REVERSE_URL ?? 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT =
  process.env.GEOCODER_USER_AGENT ??
  'ChaihuoMCV/1.0 route-map-automation contact: https://mcv.chaihuo.org';

const args = parseArgs(process.argv.slice(2));
const shouldApply = args.apply === true;
const minDistanceKm = Number(args['min-distance-km'] ?? 25);
const maxAgeHours = Number(args['max-age-hours'] ?? 12);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function log(message) {
  console.log(`[check-arrival] ${message}`);
}

function fail(message) {
  console.error(`[check-arrival] ${message}`);
  process.exit(1);
}

function numberArg(name) {
  if (args[name] === undefined) return null;
  const value = Number(args[name]);
  if (!Number.isFinite(value)) fail(`--${name} must be a number`);
  return value;
}

function normalizeCityName(name) {
  return String(name ?? '')
    .trim()
    .replace(/(市辖区|自治州|地区|盟|市|县|区)$/u, '');
}

function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

function stableCityId(city, cityEn) {
  return (
    slugify(cityEn) ??
    slugify(city) ??
    `city-${createHash('sha1').update(city).digest('hex').slice(0, 8)}`
  );
}

function haversineKm(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function formatRouteDate(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}.${get('month')}.${get('day')}`;
}

function parseStopFile(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  return parseYaml(match[1]);
}

function loadStops() {
  const stopsDir = join(ROOT, 'src/content/stops');
  return readdirSync(stopsDir)
    .filter((file) => file.endsWith('.md') && !file.endsWith('.en.md') && !file.startsWith('_'))
    .map((file) => ({ file, data: parseStopFile(join(stopsDir, file)) }))
    .sort((a, b) => a.data.order - b.data.order);
}

function loadAliases() {
  const file = join(ROOT, 'scripts/location-city-aliases.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

function findAlias(aliases, city) {
  const normalized = normalizeCityName(city);
  return aliases[city] ?? aliases[normalized] ?? null;
}

function cityAlreadyExists(stops, city) {
  const normalized = normalizeCityName(city);
  return stops.some(({ data }) => normalizeCityName(data.label) === normalized);
}

function latestVisitedStop(stops) {
  return [...stops]
    .reverse()
    .find(
      ({ data }) =>
        data.visited === true && data.routeOnly !== true && !data.id.endsWith('-return'),
    );
}

async function fetchLatestGps() {
  const lng = numberArg('lng');
  const lat = numberArg('lat');
  if (lng !== null && lat !== null) {
    return { lng, lat, timestamp: args.timestamp ?? new Date().toISOString(), source: 'args' };
  }

  const keyId = process.env.SENSECAP_KEY_ID;
  const keySecret = process.env.SENSECAP_KEY_SECRET;
  if (!keyId || !keySecret) {
    fail('Set SENSECAP_KEY_ID/SENSECAP_KEY_SECRET, or pass --lng and --lat for manual testing.');
  }

  const url = `${SENSECAP_BASE}/view_latest_telemetry_data?device_eui=${TRACKER_EUI}`;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) fail(`SenseCAP API returned HTTP ${res.status}`);

  const payload = await res.json();
  if (payload.code && payload.code !== '0') fail(`SenseCAP API returned code ${payload.code}`);

  const points = [];
  collectTelemetryPoints(payload, points);
  const lngPoint = points.find((point) => String(point.measurement_id) === '4197');
  const latPoint = points.find((point) => String(point.measurement_id) === '4198');
  const parsedLng = Number(lngPoint?.measurement_value);
  const parsedLat = Number(latPoint?.measurement_value);
  if (!Number.isFinite(parsedLng) || !Number.isFinite(parsedLat)) {
    fail('SenseCAP response did not include valid longitude(4197) and latitude(4198).');
  }
  return {
    lng: parsedLng,
    lat: parsedLat,
    timestamp: lngPoint?.time ?? latPoint?.time ?? null,
    source: 'sensecap',
  };
}

function collectTelemetryPoints(value, out) {
  if (!value || typeof value !== 'object') return;
  if ('measurement_id' in value && 'measurement_value' in value) out.push(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) collectTelemetryPoints(item, out);
    } else {
      collectTelemetryPoints(child, out);
    }
  }
}

function assertFresh(timestamp) {
  if (!timestamp) return;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs)) return;
  const ageHours = ageMs / 1000 / 60 / 60;
  if (ageHours > maxAgeHours && args.force !== true) {
    fail(
      `Latest GPS is ${ageHours.toFixed(1)} hours old; use --force or --max-age-hours to override.`,
    );
  }
}

async function reverseGeocode(lng, lat, language) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', language);

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) fail(`Reverse geocoder returned HTTP ${res.status}`);
  const data = await res.json();
  const address = data.address ?? {};
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.county ??
    address.state_district ??
    address.state;
  const province = address.state ?? address.province ?? null;
  return { city: city ? normalizeCityName(city) : null, province };
}

function buildStopFiles({ order, id, label, labelEn, province, lng, lat, date }) {
  const frontmatter = `---\nid: ${id}\norder: ${order}\nvisited: true\nlabel: ${label}\nlabel_en: ${labelEn}\nprovince: ${province}\nlng: ${lng}\nlat: ${lat}\naltitude: "0"\nrelationType: community\nthemes:\n  - maker\nevent:\n  date: "${date}"\n---`;
  const zh = `${frontmatter}\n\n# ${label}\n\n## 在地遥测\n\n- 地形: 待补充\n- 阶梯: 待补充\n- 气候: 待补充\n- 极境挑战: 待补充\n\n## 在地共创\n\n- 待补充\n\n## 现场记\n\n定位器检测到基地车抵达${label}，路线图已自动记录该城市节点。详细现场记录待补充。\n\n## 远征日志\n\n### 新世界\n\n待补充\n\n### 火种\n\n待补充\n\n### 越界\n\n待补充\n`;
  const en = `# ${labelEn}\n\n## Telemetry\n\n- Terrain: To be updated\n- Step: To be updated\n- Climate: To be updated\n- Challenge: To be updated\n\n## Activities\n\n- To be updated\n\n## Event\n\nThe location tracker detected that the mobile lab arrived in ${labelEn}. The detailed field note will be updated later.\n\n## Expedition Log\n\n### World\n\nTo be updated\n\n### Fire\n\nTo be updated\n\n### Frontier\n\nTo be updated\n`;
  return { zh, en };
}

function addProvinceIfNeeded(province) {
  const file = join(ROOT, 'src/features/route-map/visited-provinces.ts');
  let text = readFileSync(file, 'utf8');
  if (text.includes(`'${province}'`)) return false;
  text = text.replace(/\n\];\s*$/u, `\n  '${province}',\n];\n`);
  if (shouldApply) writeFileSync(file, text);
  return true;
}

function writeStopFiles(nextStop) {
  const stopsDir = join(ROOT, 'src/content/stops');
  const pad = String(nextStop.order).padStart(2, '0');
  const zhPath = join(stopsDir, `${pad}-${nextStop.id}.md`);
  const enPath = join(stopsDir, `${pad}-${nextStop.id}.en.md`);
  if (existsSync(zhPath) || existsSync(enPath)) {
    fail(`Stop file already exists for ${pad}-${nextStop.id}`);
  }
  const files = buildStopFiles(nextStop);
  if (shouldApply) {
    writeFileSync(zhPath, files.zh);
    writeFileSync(enPath, files.en);
  }
  log(`${shouldApply ? 'Created' : 'Would create'} ${zhPath}`);
  log(`${shouldApply ? 'Created' : 'Would create'} ${enPath}`);
}

async function main() {
  const stops = loadStops();
  const latest = latestVisitedStop(stops);
  if (!latest) fail('No latest visited stop found.');

  const gps = await fetchLatestGps();
  assertFresh(gps.timestamp);
  log(`GPS ${gps.lat}, ${gps.lng}${gps.timestamp ? ` at ${gps.timestamp}` : ''} (${gps.source})`);

  const distanceFromLatest = haversineKm(
    { lng: latest.data.lng, lat: latest.data.lat },
    { lng: gps.lng, lat: gps.lat },
  );
  log(`Distance from latest stop ${latest.data.label}: ${distanceFromLatest.toFixed(1)} km`);
  if (distanceFromLatest < minDistanceKm && args.force !== true) {
    log(`Within ${minDistanceKm} km of latest stop. No update needed.`);
    return;
  }

  const cityFromArgs = args.city ? normalizeCityName(args.city) : null;
  const provinceFromArgs = args.province ? String(args.province).trim() : null;
  const zhGeo =
    cityFromArgs && provinceFromArgs
      ? { city: cityFromArgs, province: provinceFromArgs }
      : await reverseGeocode(gps.lng, gps.lat, 'zh-CN');

  if (!zhGeo.city || !zhGeo.province) fail('Could not resolve city/province from current GPS.');
  log(`Resolved location: ${zhGeo.city}, ${zhGeo.province}`);

  if (cityAlreadyExists(stops, zhGeo.city)) {
    log(`City ${zhGeo.city} already exists in stops. No update needed.`);
    return;
  }

  const aliases = loadAliases();
  const alias = findAlias(aliases, zhGeo.city);
  const enGeo = alias ? null : await reverseGeocode(gps.lng, gps.lat, 'en');
  const label = alias?.label ?? zhGeo.city;
  const labelEn = alias?.label_en ?? enGeo?.city ?? label;
  const id = args.id ?? alias?.id ?? stableCityId(label, labelEn);
  const province = alias?.province ?? zhGeo.province;
  const nextOrder = Math.max(...stops.map(({ data }) => data.order)) + 1;
  const date = formatRouteDate(gps.timestamp);

  const nextStop = {
    order: nextOrder,
    id,
    label,
    labelEn,
    province,
    lng: Number(gps.lng.toFixed(6)),
    lat: Number(gps.lat.toFixed(6)),
    date,
  };

  log(`${shouldApply ? 'Adding' : 'Dry run: would add'} stop #${nextOrder} ${label} (${id})`);
  writeStopFiles(nextStop);
  const provinceAdded = addProvinceIfNeeded(province);
  if (provinceAdded) log(`${shouldApply ? 'Added' : 'Would add'} province ${province}`);
  if (!shouldApply) log('Dry run only. Re-run with --apply to write files.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
