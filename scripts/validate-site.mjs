#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import { parseStopBody } from '../src/features/route-map/stops-body-parser.mjs';

const root = process.cwd();
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  check(Boolean(match), `${filePath}: missing frontmatter block`);
  if (!match) return { data: {}, body: '' };

  const data = {};
  let currentArrayKey = null;
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const arrayItem = line.match(/^\s*-\s*(.*)$/);
    if (arrayItem && currentArrayKey) {
      data[currentArrayKey].push(stripQuotes(arrayItem[1]));
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;

    const [, key, rawValue] = keyValue;
    if (rawValue === '') {
      data[key] = [];
      currentArrayKey = key;
    } else if (rawValue === '[]') {
      data[key] = [];
      currentArrayKey = null;
    } else {
      data[key] = stripQuotes(rawValue);
      currentArrayKey = null;
    }
  }

  return { data, body: match[2] };
}

function loadTsModule(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    compiled,
    {
      exports: module.exports,
      module,
      require: (specifier) => {
        throw new Error(`${relativePath}: unexpected runtime import ${specifier}`);
      },
    },
    { filename: filePath },
  );
  return module.exports;
}

function loadStopsFromMd() {
  const dir = path.join(root, 'src/content/stops');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'));
  return files.map((file) => {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) throw new Error(`${file}: missing frontmatter`);
    const data = parseYaml(m[1]);
    return { file, data };
  });
}

function walkFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, out);
    } else if (predicate(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function hasUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    check(Boolean(item.id), `${label}: item is missing id`);
    if (!item.id) continue;
    check(!seen.has(item.id), `${label}: duplicate id "${item.id}"`);
    seen.add(item.id);
  }
  return seen;
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function publicAssetExists(assetPath) {
  if (!assetPath || isHttpUrl(assetPath)) return true;
  if (!assetPath.startsWith('/')) return false;
  return fs.existsSync(path.join(root, 'public', assetPath.slice(1)));
}

function compareLocaleDictionaries() {
  const dir = path.join(root, 'src/i18n');
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.ts') && name !== 'index.ts');

  for (const file of files) {
    const mod = loadTsModule(`src/i18n/${file}`);
    const dict = mod.default;
    check(Boolean(dict?.zh), `${file}: missing zh dictionary`);
    check(Boolean(dict?.en), `${file}: missing en dictionary`);
    if (!dict?.zh || !dict?.en) continue;

    const zhKeys = new Set(Object.keys(dict.zh));
    const enKeys = new Set(Object.keys(dict.en));
    for (const key of zhKeys) check(enKeys.has(key), `${file}: en missing key "${key}"`);
    for (const key of enKeys) check(zhKeys.has(key), `${file}: zh missing key "${key}"`);
  }
}

function validateRouteMirrors() {
  const pagesDir = path.join(root, 'src/pages');
  const zhPages = walkFiles(
    pagesDir,
    (file) => file.endsWith('.astro') && !file.includes(`${path.sep}en${path.sep}`),
  );

  for (const page of zhPages) {
    const rel = path.relative(pagesDir, page);
    const enMirror = path.join(pagesDir, 'en', rel);
    check(
      fs.existsSync(enMirror),
      `src/pages/${rel}: missing English mirror at src/pages/en/${rel}`,
    );
  }
}

function validateStructuredData() {
  const team = readJson('src/data/team.json');
  const boardings = readJson('src/data/boardings.json');
  const equipment = readJson('src/data/equipment.json');
  const heroes = readJson('src/data/heroes.json');
  const faq = readJson('src/data/faq.json');
  const partners = readJson('src/data/partners.json');
  const stopsDir = path.join(root, 'src/content/stops');
  const stopFiles = loadStopsFromMd();
  const routeCities = stopFiles.map((s) => s.data);
  const stopFileById = new Map(stopFiles.map((s) => [s.data.id, s.file]));

  const teamIds = hasUniqueIds(team, 'team.json');
  const equipmentIds = hasUniqueIds(equipment, 'equipment.json');
  hasUniqueIds(heroes, 'heroes.json');
  hasUniqueIds(faq, 'faq.json');
  hasUniqueIds(partners, 'partners.json');
  const routeCityIds = hasUniqueIds(routeCities, 'stops');

  for (const member of team) {
    check(
      publicAssetExists(member.image),
      `team.json:${member.id}: missing public image ${member.image}`,
    );
  }

  for (const hero of heroes) {
    check(Boolean(hero.alt), `heroes.json:${hero.id}: missing zh alt text`);
    check(Boolean(hero.alt_en), `heroes.json:${hero.id}: missing en alt text`);
    check(
      publicAssetExists(hero.image),
      `heroes.json:${hero.id}: missing public image ${hero.image}`,
    );
  }

  const boardingIds = hasUniqueIds(boardings, 'boardings.json');
  for (const boarding of boardings) {
    check(
      teamIds.has(boarding.crewId),
      `boardings.json:${boarding.id}: unknown crewId "${boarding.crewId}"`,
    );
    check(
      isDateString(boarding.boardedAt?.date),
      `boardings.json:${boarding.id}: invalid boardedAt.date`,
    );
    check(
      Boolean(boarding.boardedAt?.location_en),
      `boardings.json:${boarding.id}: missing boardedAt.location_en`,
    );
    if (boarding.disembarkedAt) {
      check(
        isDateString(boarding.disembarkedAt.date),
        `boardings.json:${boarding.id}: invalid disembarkedAt.date`,
      );
      check(
        boarding.disembarkedAt.date >= boarding.boardedAt.date,
        `boardings.json:${boarding.id}: disembarkedAt.date is before boardedAt.date`,
      );
      check(
        Boolean(boarding.disembarkedAt.location_en),
        `boardings.json:${boarding.id}: missing disembarkedAt.location_en`,
      );
      if (boarding.disembarkedAt.handoffTo) {
        check(
          teamIds.has(boarding.disembarkedAt.handoffTo),
          `boardings.json:${boarding.id}: unknown handoffTo "${boarding.disembarkedAt.handoffTo}"`,
        );
      }
    }
  }
  check(boardingIds.size === boardings.length, 'boardings.json: duplicate ids detected');

  for (const category of equipment) {
    check(Boolean(category.title_en), `equipment.json:${category.id}: missing title_en`);
    for (const item of category.items ?? []) {
      check(
        Boolean(item.name_en),
        `equipment.json:${category.id}: item "${item.name}" missing name_en`,
      );
      check(
        Boolean(item.spec_en),
        `equipment.json:${category.id}: item "${item.name}" missing spec_en`,
      );
    }
  }

  const orders = new Set();
  for (const city of routeCities) {
    const ctx = stopFileById.get(city.id) ?? city.id;
    check(/^[a-z0-9-]+$/.test(city.id), `${ctx}: id must be kebab-case ascii`);
    check(!orders.has(city.order), `${ctx}: duplicate order ${city.order}`);
    orders.add(city.order);
    check(Number.isFinite(city.lng) && Number.isFinite(city.lat), `${ctx}: invalid coordinates`);
    if (city.event) {
      if (city.event.link) check(isHttpUrl(city.event.link), `${ctx}: event link is not a URL`);
    }
  }

  // Contiguous order 0..N-1
  const orderedOrders = routeCities.map((c) => c.order).sort((a, b) => a - b);
  for (let i = 0; i < orderedOrders.length; i++) {
    check(
      orderedOrders[i] === i,
      `stops: order must be contiguous 0..N-1; missing ${i} (got ${orderedOrders[i]})`,
    );
  }

  // Filename matches <padded-order>-<id>.md; also validate body shape
  for (const { file, data } of stopFiles) {
    const expected = `${String(data.order).padStart(2, '0')}-${data.id}.md`;
    check(file === expected, `${file}: filename must be ${expected}`);

    const raw = fs.readFileSync(path.join(stopsDir, file), 'utf8');
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    // H1 == label consistency (spec §6)
    const h1m = body.match(/^#\s+(.+?)\s*$/m);
    if (h1m) {
      check(
        h1m[1].trim() === data.label,
        `${file}: H1 "${h1m[1].trim()}" != frontmatter label "${data.label}"`,
      );
    }
    try {
      const parts = parseStopBody(body, 'zh');
      // frontmatter event present but body has no 现场记 section → content omission
      if (data.event && !parts.event) {
        check(false, `${file}: frontmatter has event but body is missing the "## 现场记" section`);
      }
      // body event link must agree with frontmatter event.link
      if (parts.event?.link) {
        check(
          parts.event.link === data.event?.link,
          `${file}: body event link (${parts.event.link}) != frontmatter event.link (${data.event?.link ?? 'missing'})`,
        );
      }
      // photos src must exist under /public
      for (const p of parts.photos ?? []) {
        check(publicAssetExists(p.src), `${file}: photo src not in /public: ${p.src}`);
      }
    } catch (e) {
      check(false, `${file}: body parse failed — ${e.message}`);
    }
    // en sibling, if present, must parse with en grammar + H1 == label_en
    const enFile = file.replace(/\.md$/, '.en.md');
    const enPath = path.join(stopsDir, enFile);
    if (fs.existsSync(enPath)) {
      const enRaw = fs.readFileSync(enPath, 'utf8');
      // .en.md normally has no frontmatter, but strip it if an author added one
      // (mirrors the loader's stripFrontmatter so the validator agrees with runtime).
      const enBody = enRaw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      const enH1 = enBody.match(/^#\s+(.+?)\s*$/m);
      if (enH1 && data.label_en) {
        check(
          enH1[1].trim() === data.label_en,
          `${enFile}: H1 "${enH1[1].trim()}" != frontmatter label_en "${data.label_en}"`,
        );
      }
      try {
        parseStopBody(enBody, 'en');
      } catch (e) {
        check(false, `${enFile}: en body parse failed — ${e.message}`);
      }
    }
  }

  // Exactly one isOrigin: true
  const origins = routeCities.filter((c) => c.isOrigin === true);
  check(origins.length === 1, `stops: expected exactly one isOrigin (got ${origins.length})`);

  // people[] references (string ids) resolve to people/met files
  const peopleDir = path.join(root, 'src/content/people/met');
  const peopleIds = new Set(
    fs
      .readdirSync(peopleDir)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'))
      .map((f) => f.replace(/\.md$/, '')),
  );
  for (const c of routeCities) {
    for (const pid of c.people ?? []) {
      check(
        peopleIds.has(pid),
        `${c.id}: people ref "${pid}" has no src/content/people/met/${pid}.md`,
      );
    }
  }

  // people/met frontmatter: filename == id, image exists
  for (const pf of fs
    .readdirSync(peopleDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'))) {
    const praw = fs.readFileSync(path.join(peopleDir, pf), 'utf8');
    const pm = praw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    check(Boolean(pm), `${pf}: missing frontmatter`);
    if (pm) {
      let pd;
      try {
        pd = parseYaml(pm[1]);
      } catch (e) {
        check(false, `${pf}: frontmatter YAML parse failed — ${e.message}`);
      }
      if (pd && typeof pd === 'object') {
        check(pf === `${pd.id}.md`, `${pf}: filename must be ${pd.id}.md`);
        if (pd.image)
          check(publicAssetExists(pd.image), `${pf}: image not in /public: ${pd.image}`);
      } else if (pd !== undefined) {
        check(false, `${pf}: frontmatter YAML is empty or not an object`);
      }
    }
  }

  return { routeCityIds, teamIds, equipmentIds };
}

function validateJournals({ routeCityIds, teamIds, equipmentIds }) {
  const journalFiles = walkFiles(path.join(root, 'src/content/journals'), (file) =>
    file.endsWith('.md'),
  );

  for (const file of journalFiles) {
    const rel = path.relative(root, file);
    const { data, body } = parseFrontmatter(file);
    check(isDateString(data.date), `${rel}: invalid date`);
    check(
      ['published', 'placeholder', 'draft'].includes(data.status),
      `${rel}: invalid status "${data.status}"`,
    );
    check(routeCityIds.has(data.city), `${rel}: unknown city "${data.city}"`);
    check(Boolean(data.title_en), `${rel}: missing title_en`);
    check(Boolean(data.excerpt_en), `${rel}: missing excerpt_en`);

    for (const personId of data.people ?? []) {
      check(teamIds.has(personId), `${rel}: unknown person id "${personId}"`);
    }
    for (const equipmentId of data.equipment ?? []) {
      check(equipmentIds.has(equipmentId), `${rel}: unknown equipment id "${equipmentId}"`);
    }

    if ((data.activities ?? []).length > 0) {
      check(
        Array.isArray(data.activities_en) && data.activities_en.length === data.activities.length,
        `${rel}: activities_en must match activities length`,
      );
    }
    if (data.coverImage) {
      check(publicAssetExists(data.coverImage), `${rel}: missing coverImage ${data.coverImage}`);
    }
    if (data.yuqueUrl) {
      check(isHttpUrl(data.yuqueUrl), `${rel}: yuqueUrl is not a URL`);
    }
    if (data.status === 'published') {
      check(body.trim().length > 40, `${rel}: published journal body is too short`);
    }
  }
}

compareLocaleDictionaries();
validateRouteMirrors();
validateJournals(validateStructuredData());

if (failures.length > 0) {
  console.error(
    `Site validation failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`,
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site validation passed (${checks} checks).`);
