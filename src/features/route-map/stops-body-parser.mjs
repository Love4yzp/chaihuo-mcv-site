// Pure ESM body parser. NO astro:content / React / TS-only syntax.
// Maps a stop's markdown body + bodyLocale → structured BodyParts.
// Used by stops-loader.ts (Astro side), tests/harness/lib/load-stops.ts, and
// scripts/validate-site.mjs.

// Canonical heading vocab per locale. Parser matches heading text EXACTLY.
const LABELS = {
  zh: {
    telemetry: '在地遥测',
    activities: '在地共创',
    event: '现场记',
    expedition: '远征日志',
    photos: '照片',
    expWorld: '新世界',
    expFire: '火种',
    expFrontier: '越界',
    teleTerrain: '地形',
    teleStep: '阶梯',
    teleClimate: '气候',
    teleChallenge: '极境挑战',
  },
  en: {
    telemetry: 'Telemetry',
    activities: 'Activities',
    event: 'Event',
    expedition: 'Expedition Log',
    photos: 'Photos',
    expWorld: 'World',
    expFire: 'Fire',
    expFrontier: 'Frontier',
    teleTerrain: 'Terrain',
    teleStep: 'Step',
    teleClimate: 'Climate',
    teleChallenge: 'Challenge',
  },
};

// Split markdown into sections keyed by their h2 text, preserving order.
function splitSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let current = null;
  let h1 = null;
  for (const line of lines) {
    const h1m = line.match(/^#\s+(.+?)\s*$/);
    const h2m = line.match(/^##\s+(.+?)\s*$/);
    const h3m = line.match(/^###\s+(.+?)\s*$/);
    if (h1m) { h1 = h1m[1]; continue; }
    if (h2m) {
      current = { heading: h2m[1], level: 2, lines: [], subs: [] };
      sections.push(current);
      continue;
    }
    if (h3m && current) {
      const sub = { heading: h3m[1], level: 3, lines: [] };
      current.subs.push(sub);
      continue;
    }
    if (current) {
      const target = current.subs.length ? current.subs[current.subs.length - 1] : current;
      target.lines.push(line);
    }
  }
  return { h1, sections };
}

function firstParagraph(lines) {
  const text = lines.join('\n').trim();
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks;
}

function parseBullets(lines) {
  return lines
    .map((l) => l.match(/^\s*-\s+(.*\S)\s*$/))
    .filter(Boolean)
    .map((m) => m[1]);
}

export function parseStopBody(markdown, bodyLocale) {
  const L = LABELS[bodyLocale];
  if (!L) throw new Error(`parseStopBody: unknown bodyLocale ${bodyLocale}`);
  const { sections } = splitSections(markdown);
  const byHeading = new Map(sections.map((s) => [s.heading, s]));

  // ── Section order enforcement (spec §6) ──
  const CANONICAL_ORDER = [L.telemetry, L.activities, L.event, L.expedition, L.photos];
  const presentInOrder = sections.map((s) => s.heading).filter((h) => CANONICAL_ORDER.includes(h));
  const expectedOrder = CANONICAL_ORDER.filter((h) => byHeading.has(h));
  for (let i = 0; i < expectedOrder.length; i++) {
    if (presentInOrder[i] !== expectedOrder[i]) {
      throw new Error(`sections out of order: expected ${expectedOrder.join(' / ')}, got ${presentInOrder.join(' / ')}`);
    }
  }

  // ── Telemetry (required) ──
  const tele = byHeading.get(L.telemetry);
  if (!tele) throw new Error(`missing required section: ${L.telemetry}`);
  const teleItems = parseBullets(tele.lines);
  const teleMap = {};
  for (const item of teleItems) {
    const m = item.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (!m) throw new Error(`telemetry item not "label: value": ${item}`);
    teleMap[m[1].trim()] = m[2].trim();
  }
  const need = [L.teleTerrain, L.teleStep, L.teleClimate, L.teleChallenge];
  for (const k of need) {
    if (!(k in teleMap)) throw new Error(`telemetry missing label "${k}"`);
  }
  if (Object.keys(teleMap).length !== 4) {
    throw new Error(`telemetry must have exactly 4 items, got ${Object.keys(teleMap).length}`);
  }

  // ── Activities (required) ──
  const act = byHeading.get(L.activities);
  if (!act) throw new Error(`missing required section: ${L.activities}`);
  const relationStats = parseBullets(act.lines);
  if (relationStats.length === 0) throw new Error(`${L.activities} must have ≥1 item`);

  const parts = {
    terrain: teleMap[L.teleTerrain],
    terrainStep: teleMap[L.teleStep],
    climate: teleMap[L.teleClimate],
    challenge: teleMap[L.teleChallenge],
    relationStats,
  };

  // ── Event (optional) ──
  const ev = byHeading.get(L.event);
  if (ev) {
    const blocks = firstParagraph(ev.lines);
    let summary;
    let link;
    let linkLabel;
    for (const b of blocks) {
      const linkm = b.match(/^\[(.+?)\]\((\S+?)\)$/);
      if (linkm) { linkLabel = linkm[1]; link = linkm[2]; }
      else if (!summary) { summary = b; }
    }
    if (summary) parts.event = { summary, link, linkLabel };
  }

  // ── Expedition (optional, exactly 3 subs in order) ──
  const exp = byHeading.get(L.expedition);
  if (exp) {
    const want = [L.expWorld, L.expFire, L.expFrontier];
    const got = exp.subs.map((s) => s.heading);
    if (got.length !== 3 || got[0] !== want[0] || got[1] !== want[1] || got[2] !== want[2]) {
      throw new Error(`${L.expedition} must have exactly 3 subs: ${want.join(' / ')}; got ${got.join(' / ')}`);
    }
    parts.expedition = {
      world: firstParagraph(exp.subs[0].lines)[0] ?? '',
      fire: firstParagraph(exp.subs[1].lines)[0] ?? '',
      frontier: firstParagraph(exp.subs[2].lines)[0] ?? '',
    };
  }

  // ── Photos (optional) ──
  const ph = byHeading.get(L.photos);
  if (ph) {
    const photos = ph.lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^!\[(.*?)\]\((\S+?)\)$/);
        if (!m) throw new Error(`photo line is not a pure image embed: ${l}`);
        return { src: m[2], caption: m[1] };
      });
    if (photos.length) parts.photos = photos;
  }

  return parts;
}
