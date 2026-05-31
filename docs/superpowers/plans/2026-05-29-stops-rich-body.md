# Stops Rich-Body Authoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-05-29-stops-rich-body-design.md` (2 Codex rounds → GO).
> **Project rule:** NEVER commit anything under `docs/superpowers/`. Do NOT modify the HERO slogan. `pnpm` only. Acceptance gate = `pnpm check` (= `check:content` then `astro check`), NOT raw `astro check`.

**Goal:** Reshape `src/content/stops/*.md` from all-YAML-frontmatter to minimal frontmatter + heading-anchored markdown body, with a sibling `*.en.md` per stop for English, and extract people-met into a new `src/content/people/met/` collection — while preserving all visible site behavior and the React-island `Stop` field contract.

**Architecture:** A pure ESM parser (`stops-body-parser.mjs`) turns a markdown body + `bodyLocale` into structured `BodyParts`; an Astro-side loader (`stops-loader.ts`) reads the collection, picks zh/en body by `requestedLocale` (falling back to zh body when `.en.md` is missing, but keeping `requestedLocale` for the `'Read field log'` linkLabel default), runs the parser, resolves `people[]` ids against the people collection, and assembles the consumer-facing `Stop`. The cutover (one commit) swaps data shape + schema + loader + validator + pages + test-helper together because none of those can straddle the old/new shape.

**Tech Stack:** Astro 6.3 + React 19 islands + TypeScript strict + Tailwind v4 + Playwright harness (chromium-desktop + chromium-mobile). `yaml` (direct dep from Phase 4). No new deps.

---

## File structure

- **Create** `src/features/route-map/stops-body-parser.mjs` — pure ESM. `parseStopBody(markdown, bodyLocale)` → `BodyParts`. Importable from `.ts` (loader, test helper) and `.mjs` (`validate-site.mjs`).
- **Create** `src/features/route-map/stops-loader.ts` — Astro-side. Defines canonical `Stop` / `StopEvent` / `ResolvedPerson` types + `loadLocalizedStops(requestedLocale)`.
- **Create** `src/features/route-map/people-schema.ts` — Zod `personFrontmatterSchema` + `PersonFrontmatter`.
- **Modify** `src/features/route-map/stops-schema.ts` — rewrite to export ONLY `stopFrontmatterSchema`, `StopFrontmatter`, `StopRelationType`, `StopThemeType`.
- **Modify** `src/content.config.ts` — register `people-met` collection; change stops glob pattern; register people glob.
- **Modify** `src/features/route-map/types.ts` — import `Stop`/`StopEvent` from `stops-loader` instead of `stops-schema`.
- **Modify** `src/app/components/HomeContent.tsx` — import `Stop` from `stops-loader`.
- **Modify** `src/lib/journals.ts` — import `Stop` from `stops-loader`; `city.label_en ?? city.label` → `city.label`.
- **Modify** `src/features/route-map/projection.ts` — delete `localizeStop`; drop its `Stop` import.
- **Modify** 8 `.astro` pages — replace `getCollection('stops').map(localizeStop)` with `loadLocalizedStops(locale)`.
- **Modify** `tests/harness/lib/load-stops.ts` — refactor to fs+yaml frontmatter + `parseStopBody` body; no `astro:content` import.
- **Modify** `tests/harness/route-map-coordinates.spec.ts` — `Stop` import from `stops-loader`; add loader-level tests.
- **Create** `tests/harness/stops-body-parser.spec.ts` — parser unit tests.
- **Modify** `scripts/validate-site.mjs` — read new stop shape, body-shape checks, people checks.
- **Create then delete** `scripts/migrate-stops-to-rich-body.mjs` — one-shot.
- **Rewrite** `src/content/stops/*.md` (9) + **Create** `*.en.md` (9) + `_template.md` + `_template.en.md`.
- **Create** `src/content/people/met/{wei-shifu,maker-mo}.md` + `.en.md`.

Test commands:
- `pnpm exec astro check` — schema typecheck
- `pnpm run check` — validate-site + astro check (gate)
- `pnpm exec playwright test tests/harness/stops-body-parser.spec.ts` — parser units (node)
- `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop`
- `pnpm run harness` — full, both projects

---

### Task 0: Create the feature branch

**Files:** none (git).

- [ ] **Step 1: Branch off main**

```bash
git checkout main
git pull origin main          # origin = deploy fork; Phases 1-4 shipped here
git checkout -b feature/stops-rich-body
git branch --show-current     # expect: feature/stops-rich-body
```

---

### Task 1: Pure body parser + parser unit tests (TDD core)

**Files:**
- Create: `src/features/route-map/stops-body-parser.mjs`
- Create: `tests/harness/stops-body-parser.spec.ts`

Pure ESM — NO `astro:content`, React, or TS-only syntax. This is the testable heart.

> **H1 handling (resolves spec §6 H1-match requirement, Codex plan-review should-fix):** `parseStopBody(markdown, bodyLocale)` has no frontmatter `label` input, so it CANNOT verify the optional `# <label>` against frontmatter. Resolution: the parser captures `h1` but treats it as cosmetic (ignored — not returned, not validated). The `H1 == label` consistency check moves to `validate-site.mjs` (T6), which has both the body and the frontmatter. The spec's intent (catch a stale H1 after a rename) is satisfied at the validator layer, not the parser layer.

- [ ] **Step 1: Write the failing parser tests**

`tests/harness/stops-body-parser.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
// @ts-expect-error - pure .mjs, no type declarations needed for tests
import { parseStopBody } from '../../src/features/route-map/stops-body-parser.mjs';

const ZH_FULL = `# 柳州

## 在地遥测

- 地形: 桂中溶蚀喀斯特平原盆地
- 阶梯: 第三级阶梯
- 气候: 中亚热带季风气候
- 极境挑战: 农业基地起伏泥泞土路行驶,车载边缘 AI 摄像头防尘抖动图像补偿纠偏

## 在地共创

- 深入三都镇养殖种植基地
- 与新农人面对面技术对话
- AI 检测场景探讨

## 现场记

走进柳州·三都镇的农业养殖种植基地,与新农人面对面,开展技术行业交流。

[阅读领队日记](https://www.yuque.com/x)

## 远征日志

### 新世界

桂中喀斯特盆地·三都镇的养殖与种植基地,泥泞起伏的农业一线。

### 火种

车载边缘 AI 摄像头与六轴机械臂,把实验室级的检测能力带到鱼塘边。

### 越界

把六轴机械臂,开进了养鱼塘。

## 照片

![桂中喀斯特地貌](/heroes/karst-guangxi.webp)
`;

const ZH_MINIMAL = `## 在地遥测

- 地形: 平原
- 阶梯: 第二级阶梯
- 气候: 温带
- 极境挑战: 风沙

## 在地共创

- 活动一
`;

test('parseStopBody extracts all sections from a full zh body', () => {
  const r = parseStopBody(ZH_FULL, 'zh');
  expect(r.terrain).toBe('桂中溶蚀喀斯特平原盆地');
  expect(r.terrainStep).toBe('第三级阶梯');
  expect(r.climate).toBe('中亚热带季风气候');
  expect(r.challenge).toContain('农业基地起伏泥泞土路行驶');
  expect(r.relationStats).toEqual(['深入三都镇养殖种植基地', '与新农人面对面技术对话', 'AI 检测场景探讨']);
  expect(r.event.summary).toContain('走进柳州');
  expect(r.event.linkLabel).toBe('阅读领队日记');
  expect(r.event.link).toBe('https://www.yuque.com/x');
  expect(r.expedition.world).toContain('桂中喀斯特盆地');
  expect(r.expedition.fire).toContain('车载边缘 AI');
  expect(r.expedition.frontier).toBe('把六轴机械臂,开进了养鱼塘。');
  expect(r.photos).toEqual([{ src: '/heroes/karst-guangxi.webp', caption: '桂中喀斯特地貌' }]);
});

test('parseStopBody omits optional sections when absent', () => {
  const r = parseStopBody(ZH_MINIMAL, 'zh');
  expect(r.terrain).toBe('平原');
  expect(r.relationStats).toEqual(['活动一']);
  expect(r.event).toBeUndefined();
  expect(r.expedition).toBeUndefined();
  expect(r.photos).toBeUndefined();
});

test('parseStopBody throws when a required section is missing', () => {
  expect(() => parseStopBody('## 在地共创\n\n- x\n', 'zh')).toThrow(/在地遥测|Telemetry/);
});

test('parseStopBody throws when present sections are out of order', () => {
  const outOfOrder = `## 在地共创

- 活动一

## 在地遥测

- 地形: a
- 阶梯: b
- 气候: c
- 极境挑战: d
`;
  expect(() => parseStopBody(outOfOrder, 'zh')).toThrow(/out of order/i);
});

test('parseStopBody throws when telemetry label is not canonical', () => {
  const bad = `## 在地遥测

- 地形: a
- WRONG: b
- 气候: c
- 极境挑战: d

## 在地共创

- x
`;
  expect(() => parseStopBody(bad, 'zh')).toThrow(/telemetry|遥测|label/i);
});

test('parseStopBody parses en headings under bodyLocale en', () => {
  const en = `## Telemetry

- Terrain: Plain
- Step: Second Terrain Step
- Climate: Temperate
- Challenge: Sand

## Activities

- Activity one
`;
  const r = parseStopBody(en, 'en');
  expect(r.terrain).toBe('Plain');
  expect(r.relationStats).toEqual(['Activity one']);
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
pnpm exec playwright test tests/harness/stops-body-parser.spec.ts --project=chromium-desktop
```
Expected: FAIL — module not found / `parseStopBody is not a function`.

- [ ] **Step 3: Implement the parser**

`src/features/route-map/stops-body-parser.mjs`:

```javascript
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
// Returns { order: string[], byHeading: Map<string, { level, lines }> } and h1.
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
  // first block separated by blank line that isn't a link-only line
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
  // Sections that ARE present must appear in canonical order. Missing optional
  // sections are skipped; presence/requiredness is checked below.
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
```

- [ ] **Step 4: Run to verify PASS**

```bash
pnpm exec playwright test tests/harness/stops-body-parser.spec.ts --project=chromium-desktop
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/stops-body-parser.mjs tests/harness/stops-body-parser.spec.ts
git commit -m "feat(stops): pure markdown body parser (parseStopBody) + unit tests"
```

---

### Task 2: People schema + people collection registration (additive)

**Files:**
- Create: `src/features/route-map/people-schema.ts`
- Modify: `src/content.config.ts`

Additive — registers an empty `people-met` collection (files written in T4's migration). An empty glob collection is valid (Phase 4 proved it).

- [ ] **Step 1: Create the people schema**

`src/features/route-map/people-schema.ts`:

```typescript
import { z } from 'astro/zod';

export const personFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'person id must be kebab-case ascii'),
  name: z.string(),
  name_en: z.string().optional(),
  role: z.string().optional(),
  role_en: z.string().optional(),
  image: z.string().optional(),
});

export type PersonFrontmatter = z.infer<typeof personFrontmatterSchema>;
```

- [ ] **Step 2: Register the collection**

In `src/content.config.ts`, add the import near the top:

```typescript
import { personFrontmatterSchema } from './features/route-map/people-schema';
```

Add the collection definition before the `collections` export:

```typescript
const peopleMet = defineCollection({
  loader: glob({
    base: './src/content/people/met',
    pattern: ['*.md', '!_*.md', '!*.en.md'],
  }),
  schema: personFrontmatterSchema,
});
```

Update the `collections` export to add `'people-met': peopleMet`:

```typescript
export const collections = { notes, journals, equipment, team, faq, partners, heroes, stops, 'people-met': peopleMet };
```

- [ ] **Step 3: Create the directory so the glob has a base**

```bash
mkdir -p src/content/people/met
```

Create a placeholder so git tracks the dir until T4 fills it: write `src/content/people/met/.gitkeep` (empty file).

- [ ] **Step 4: Verify**

```bash
pnpm exec astro check
```
Expected: 0 errors. (Empty `people-met` collection is fine.)

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/people-schema.ts src/content.config.ts src/content/people/met/.gitkeep
git commit -m "feat(people): add people-met collection schema + registration (empty)"
```

---

### Task 3: Add `stopFrontmatterSchema` + `stops-loader.ts` (additive, unwired)

**Files:**
- Modify: `src/features/route-map/stops-schema.ts` (ADD the new schema alongside the old — do NOT remove old yet)
- Create: `src/features/route-map/stops-loader.ts`

Additive. The old `stopSchema` stays so the current content + consumers keep working until the T4 cutover. The new loader type-checks but isn't called yet.

- [ ] **Step 1: Add `stopFrontmatterSchema` to `stops-schema.ts`**

At the END of `src/features/route-map/stops-schema.ts` (keep everything above intact for now), append:

```typescript
// ── Phase 5: minimal frontmatter schema (body holds the prose) ──
// Added alongside the legacy stopSchema; the T4 cutover removes the legacy one.
export const stopFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().nonnegative(),
  visited: z.boolean(),
  isOrigin: z.boolean().optional(),
  anchor: z.boolean().optional(),

  label: z.string(),
  label_en: z.string().optional(),

  lng: z.number().gte(-180).lte(180),
  lat: z.number().gte(-90).lte(90),
  altitude: z.string(),

  relationType,
  themes: z.array(themeType),

  event: z.object({
    date: z.string(),
    link: z.url().optional(),
  }).optional(),

  people: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
});

export type StopFrontmatter = z.infer<typeof stopFrontmatterSchema>;
```

(`relationType` and `themeType` consts already exist at the top of the file from Phase 4 — reuse them.)

- [ ] **Step 2: Create the loader with the canonical `Stop` type**

`src/features/route-map/stops-loader.ts`:

```typescript
import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/index';
import type { StopRelationType, StopThemeType } from './stops-schema';
// @ts-expect-error - pure .mjs, no .d.ts
import { parseStopBody } from './stops-body-parser.mjs';

export type ResolvedPerson = {
  id: string;
  name: string;
  role?: string;
  image?: string;
  bio?: string;
};

export type StopEvent = {
  date: string;
  summary: string;
  link?: string;
  linkLabel?: string;
};

// Consumer-facing, already-localized shape. Field-compatible with Phase 4's Stop.
export type Stop = {
  id: string;
  order: number;
  visited: boolean;
  isOrigin?: boolean;
  anchor?: boolean;
  label: string;
  lng: number;
  lat: number;
  altitude: string;
  relationType: StopRelationType;
  themes: StopThemeType[];
  terrain: string;
  terrainStep: string;
  climate: string;
  challenge: string;
  relationStats: string[];
  event?: StopEvent;
  expedition?: { world: string; fire: string; frontier: string };
  people?: ResolvedPerson[];
  // alt = caption (set during assembly) so PhotoStrip's `alt ?? caption` keeps working
  photos?: { src: string; alt?: string; caption: string }[];
};

const READ_FIELD_LOG_EN = 'Read field log'; // mirrors t['route.action.readFieldLog'] (i18n/route.ts)

type EnBodyMap = Map<string, string>;

function pickName(fm: { name: string; name_en?: string }, requested: Locale): string {
  return requested === 'en' && fm.name_en ? fm.name_en : fm.name;
}
function pickRole(fm: { role?: string; role_en?: string }, requested: Locale): string | undefined {
  return requested === 'en' && fm.role_en ? fm.role_en : fm.role;
}

export async function loadLocalizedStops(requestedLocale: Locale): Promise<Stop[]> {
  const stopEntries = await getCollection('stops');
  const peopleEntries = await getCollection('people-met');

  // Raw bodies for *.en.md siblings (excluded from collections) via import.meta.glob.
  const enStopBodies = import.meta.glob('/src/content/stops/*.en.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const enPersonBodies = import.meta.glob('/src/content/people/met/*.en.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  const stripFrontmatter = (raw: string) => raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  const personById = new Map(peopleEntries.map((p) => [p.data.id, p]));

  const resolvePerson = (id: string): ResolvedPerson | null => {
    const entry = personById.get(id);
    if (!entry) return null;
    const fm = entry.data;
    let bio = (entry.body ?? '').trim() || undefined;
    if (requestedLocale === 'en') {
      const enPath = `/src/content/people/met/${id}.en.md`;
      const enRaw = enPersonBodies[enPath];
      if (enRaw) bio = stripFrontmatter(enRaw).trim() || bio;
    }
    return {
      id: fm.id,
      name: pickName(fm, requestedLocale),
      role: pickRole(fm, requestedLocale),
      image: fm.image,
      bio,
    };
  };

  const stops = stopEntries.map((entry) => {
    const fm = entry.data;

    // Decide bodyLocale + bodyMarkdown
    let bodyLocale: Locale = 'zh';
    let bodyMarkdown = entry.body ?? '';
    if (requestedLocale === 'en') {
      const enPath = `/src/content/stops/${String(fm.order).padStart(2, '0')}-${fm.id}.en.md`;
      const enRaw = enStopBodies[enPath];
      if (enRaw) { bodyLocale = 'en'; bodyMarkdown = stripFrontmatter(enRaw); }
    }

    const parts = parseStopBody(bodyMarkdown, bodyLocale);

    // event assembly with linkLabel fallback rule
    let event: StopEvent | undefined;
    if (fm.event) {
      let linkLabel = parts.event?.linkLabel;
      if (!linkLabel && requestedLocale === 'en' && fm.event.link) linkLabel = READ_FIELD_LOG_EN;
      event = {
        date: fm.event.date,
        summary: parts.event?.summary ?? '',
        link: fm.event.link,
        linkLabel,
      };
    }

    const photos = parts.photos?.map((p) => ({ src: p.src, alt: p.caption, caption: p.caption }));
    const people = fm.people?.map(resolvePerson).filter((p): p is ResolvedPerson => p !== null);

    const stop: Stop = {
      id: fm.id,
      order: fm.order,
      visited: fm.visited,
      isOrigin: fm.isOrigin,
      anchor: fm.anchor,
      label: requestedLocale === 'en' && fm.label_en ? fm.label_en : fm.label,
      lng: fm.lng,
      lat: fm.lat,
      altitude: fm.altitude,
      relationType: fm.relationType,
      themes: fm.themes,
      terrain: parts.terrain,
      terrainStep: parts.terrainStep,
      climate: parts.climate,
      challenge: parts.challenge,
      relationStats: parts.relationStats,
      event,
      expedition: parts.expedition,
      people,
      photos,
    };
    return stop;
  });

  return stops.sort((a, b) => a.order - b.order);
}
```

> **Note for the implementer:** `import.meta.glob` with `query: '?raw'` is Vite's raw-text import, available in Astro. This is how we read the `.en.md` sibling bodies that the collection glob excludes. If `entry.body` is not populated for the glob loader, the first task to surface it is T4's harness run — verify `entry.body` holds the raw markdown for a glob `.md` collection (it does in Astro 6); if it does not, switch the zh body read to the same `import.meta.glob` raw approach for `*.md` (minus `.en.md`).

- [ ] **Step 3: Verify it type-checks**

```bash
pnpm exec astro check
```
Expected: 0 errors. (Loader compiles; not yet imported anywhere.)

- [ ] **Step 4: Commit**

```bash
git add src/features/route-map/stops-schema.ts src/features/route-map/stops-loader.ts
git commit -m "feat(stops): add stopFrontmatterSchema + stops-loader (additive, unwired)"
```

---

### Task 4: CUTOVER — migrate data + swap schema/loader/pages/validator/test-helper (one commit)

**Files (all in one commit):**
- Create then delete: `scripts/migrate-stops-to-rich-body.mjs`
- Rewrite: `src/content/stops/*.md` (9) + new `*.en.md` (9) + `_template.md` + `_template.en.md`
- Create: `src/content/people/met/{wei-shifu,maker-mo}.md` + `.en.md`; delete `.gitkeep`
- Modify: `src/features/route-map/stops-schema.ts` (remove legacy `stopSchema` + legacy type exports)
- Modify: `src/content.config.ts` (stops `schema: stopFrontmatterSchema`, glob pattern)
- Modify: `src/features/route-map/types.ts`, `src/app/components/HomeContent.tsx`, `src/lib/journals.ts`, `src/features/route-map/projection.ts`
- Modify: 8 `.astro` pages
- Modify: `tests/harness/lib/load-stops.ts`, `tests/harness/route-map-coordinates.spec.ts` (import swap only here; new tests in T5)
- Modify: `scripts/validate-site.mjs` (minimal: read new shape without crashing)

This is atomic: old data + new schema (or vice-versa) cannot both be valid, so everything flips together. Gate at the end: `pnpm check` + `pnpm run harness`.

- [ ] **Step 1: Write the migration script**

`scripts/migrate-stops-to-rich-body.mjs`:

```javascript
#!/usr/bin/env node
// One-shot: Phase 4 YAML-only stops → Phase 5 minimal-frontmatter + body pairs,
// plus extract inline people to src/content/people/met/. Deletes itself after.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';

const root = process.cwd();
const stopsDir = path.join(root, 'src/content/stops');
const peopleDir = path.join(root, 'src/content/people/met');
fs.mkdirSync(peopleDir, { recursive: true });

function readFrontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${file}: no frontmatter`);
  return parseYaml(m[1]);
}

function teleZh(d) {
  return `## 在地遥测\n\n- 地形: ${d.terrain}\n- 阶梯: ${d.terrainStep}\n- 气候: ${d.climate}\n- 极境挑战: ${d.challenge}\n`;
}
function teleEn(d) {
  return `## Telemetry\n\n- Terrain: ${d.terrainEn}\n- Step: ${d.terrainStepEn}\n- Climate: ${d.climateEn}\n- Challenge: ${d.challengeEn}\n`;
}
function actZh(d) {
  return `## 在地共创\n\n${d.relationStats.map((s) => `- ${s}`).join('\n')}\n`;
}
function actEn(d) {
  return `## Activities\n\n${(d.relationStatsEn ?? d.relationStats).map((s) => `- ${s}`).join('\n')}\n`;
}
function eventZh(d) {
  if (!d.event) return '';
  let out = `## 现场记\n\n${d.event.summary}\n`;
  if (d.event.link && d.event.linkLabel) out += `\n[${d.event.linkLabel}](${d.event.link})\n`;
  return out;
}
function eventEn(d) {
  if (!d.event) return '';
  let out = `## Event\n\n${d.event.summary_en ?? d.event.summary}\n`;
  if (d.event.link && (d.event.linkLabel_en || d.event.linkLabel)) {
    out += `\n[${d.event.linkLabel_en ?? d.event.linkLabel}](${d.event.link})\n`;
  }
  return out;
}
function expZh(d) {
  if (!d.expedition) return '';
  const e = d.expedition;
  return `## 远征日志\n\n### 新世界\n\n${e.world}\n\n### 火种\n\n${e.fire}\n\n### 越界\n\n${e.frontier}\n`;
}
function expEn(d) {
  if (!d.expedition) return '';
  const e = d.expedition;
  return `## Expedition Log\n\n### World\n\n${e.world_en ?? e.world}\n\n### Fire\n\n${e.fire_en ?? e.fire}\n\n### Frontier\n\n${e.frontier_en ?? e.frontier}\n`;
}
function photosZh(d) {
  if (!d.photos) return '';
  return `## 照片\n\n${d.photos.map((p) => `![${p.caption ?? p.alt ?? ''}](${p.src})`).join('\n')}\n`;
}
function photosEn(d) {
  if (!d.photos) return '';
  return `## Photos\n\n${d.photos.map((p) => `![${p.caption_en ?? p.caption ?? p.alt ?? ''}](${p.src})`).join('\n')}\n`;
}

function pad(n) { return String(n).padStart(2, '0'); }

const files = fs.readdirSync(stopsDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'));

for (const file of files) {
  const d = readFrontmatter(path.join(stopsDir, file));

  // minimal frontmatter
  const fm = {
    id: d.id, order: d.order, visited: d.visited,
    ...(d.isOrigin ? { isOrigin: true } : {}),
    ...(d.anchor ? { anchor: true } : {}),
    label: d.label,
    ...(d.label_en ? { label_en: d.label_en } : {}),
    lng: d.lng, lat: d.lat, altitude: d.altitude,
    relationType: d.relationType, themes: d.themes,
    ...(d.event ? { event: { date: d.event.date, ...(d.event.link ? { link: d.event.link } : {}) } } : {}),
    ...(d.people ? { people: d.people.map((p) => p.id) } : {}),
  };
  const yaml = yamlStringify(fm, { lineWidth: 0 });

  // zh body
  let zhBody = `# ${d.label}\n\n` + teleZh(d) + '\n' + actZh(d);
  if (d.event) zhBody += '\n' + eventZh(d);
  if (d.expedition) zhBody += '\n' + expZh(d);
  if (d.photos) zhBody += '\n' + photosZh(d);
  fs.writeFileSync(path.join(stopsDir, `${pad(d.order)}-${d.id}.md`), `---\n${yaml}---\n\n${zhBody}`, 'utf8');

  // en body (only if the stop has en data — label_en is the canary; all 9 do)
  let enBody = `# ${d.label_en ?? d.label}\n\n` + teleEn(d) + '\n' + actEn(d);
  if (d.event) enBody += '\n' + eventEn(d);
  if (d.expedition) enBody += '\n' + expEn(d);
  if (d.photos) enBody += '\n' + photosEn(d);
  fs.writeFileSync(path.join(stopsDir, `${pad(d.order)}-${d.id}.en.md`), enBody, 'utf8');

  // extract people
  for (const p of d.people ?? []) {
    const pfm = {
      id: p.id, name: p.name,
      ...(p.name_en ? { name_en: p.name_en } : {}),
      ...(p.role ? { role: p.role } : {}),
      ...(p.role_en ? { role_en: p.role_en } : {}),
      ...(p.image ? { image: p.image } : {}),
    };
    const pYaml = yamlStringify(pfm, { lineWidth: 0 });
    fs.writeFileSync(path.join(peopleDir, `${p.id}.md`), `---\n${pYaml}---\n\n${p.bio ?? ''}\n`, 'utf8');
    if (p.bio_en) fs.writeFileSync(path.join(peopleDir, `${p.id}.en.md`), `${p.bio_en}\n`, 'utf8');
  }
  console.log(`migrated ${file}`);
}

// templates
fs.writeFileSync(path.join(stopsDir, '_template.md'), `---
id: ""
order: 0
visited: false
label: ""
label_en: ""
lng: 0
lat: 0
altitude: "0"
relationType: education
themes: [science]
# event:
#   date: "YYYY.MM.DD"
#   link: "https://..."
# people:
#   - some-person-id
---

# 城市名

## 在地遥测

- 地形: 
- 阶梯: 
- 气候: 
- 极境挑战: 

## 在地共创

- 

## 现场记

事件简述。

## 远征日志

### 新世界

### 火种

### 越界

## 照片

![描述](/path/to.webp)
`, 'utf8');

fs.writeFileSync(path.join(stopsDir, '_template.en.md'), `# City Name

## Telemetry

- Terrain: 
- Step: 
- Climate: 
- Challenge: 

## Activities

- 

## Event

Event summary.

## Expedition Log

### World

### Fire

### Frontier

## Photos

![caption](/path/to.webp)
`, 'utf8');

console.log('done');
```

- [ ] **Step 2: Run the migration + delete the .gitkeep**

```bash
node scripts/migrate-stops-to-rich-body.mjs
rm -f src/content/people/met/.gitkeep
ls src/content/stops/      # expect 00-..08 .md + .en.md pairs + _template.md/_template.en.md
ls src/content/people/met/ # expect wei-shifu.md/.en.md, maker-mo.md/.en.md
```

- [ ] **Step 3: Spot-check generated 05-liuzhou.md + .en.md**

```bash
cat src/content/stops/05-liuzhou.md
cat src/content/stops/05-liuzhou.en.md
cat src/content/people/met/wei-shifu.md
```
Confirm: minimal frontmatter (id/order/visited/anchor/label/label_en/lng/lat/altitude/relationType/themes/event{date,link}/people:[wei-shifu]); zh body has all 5 sections; en body mirrors; person file has frontmatter + bio.

- [ ] **Step 4: Rewrite `stops-schema.ts` to frontmatter-only**

Replace the ENTIRE file `src/features/route-map/stops-schema.ts` with:

```typescript
import { z } from 'astro/zod';

const relationType = z.enum(['departure', 'education', 'community', 'industry']);
const themeType = z.enum(['science', 'maker', 'industry']);

export const stopFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().nonnegative(),
  visited: z.boolean(),
  isOrigin: z.boolean().optional(),
  anchor: z.boolean().optional(),

  label: z.string(),
  label_en: z.string().optional(),

  lng: z.number().gte(-180).lte(180),
  lat: z.number().gte(-90).lte(90),
  altitude: z.string(),

  relationType,
  themes: z.array(themeType),

  event: z.object({
    date: z.string(),
    link: z.url().optional(),
  }).optional(),

  people: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
});

export type StopFrontmatter = z.infer<typeof stopFrontmatterSchema>;
export type StopRelationType = z.infer<typeof relationType>;
export type StopThemeType = z.infer<typeof themeType>;
```

- [ ] **Step 5: Point the stops collection at the new schema + glob pattern**

In `src/content.config.ts`:
- change the stops import line from `import { stopSchema }` to `import { stopFrontmatterSchema } from './features/route-map/stops-schema';`
- in the `stops` defineCollection: `schema: stopFrontmatterSchema` and `loader: glob({ base: './src/content/stops', pattern: ['*.md', '!_*.md', '!*.en.md'] })`

- [ ] **Step 6: Swap type-import sources**

- `src/features/route-map/types.ts` line 1: `import type { Stop, StopEvent } from './stops-loader';`
- `src/app/components/HomeContent.tsx:11`: `import type { Stop as RouteCity } from "@/features/route-map/stops-loader";`
- `src/lib/journals.ts:3`: `import type { Stop } from '@/features/route-map/stops-loader';`
- `tests/harness/route-map-coordinates.spec.ts:4`: `import type { Stop as RouteCity } from '../../src/features/route-map/stops-loader';`

- [ ] **Step 6b: Delete the Phase 4 `localizeStop` unit tests** (Codex plan-review Blocker #2)

`tests/harness/route-map-coordinates.spec.ts` has 5 Phase 4 `localizeStop` tests (currently ~lines 564-644, the `import { localizeStop } from '../../src/features/route-map/projection'` block + the 5 `test('localizeStop …')` cases). Step 8 deletes `localizeStop`, so these tests would fail the T4 gate. **Delete the `localizeStop` import line AND all 5 `localizeStop` test blocks now.** Their behavioral coverage is replaced by the loader-level tests added in T5 (the `'Read field log'` default, photo `alt = caption`, en localization, people resolution are all re-asserted there).

- [ ] **Step 7: `journals.ts` one-liner**

In `src/lib/journals.ts` (~line 67), the `cityLabel` build currently does `locale === 'en' && city.label_en ? city.label_en : city.label`. Since `cities` now comes from `loadLocalizedStops(locale)` (already localized), change to just `city.label`. (The `Stop` type no longer has `label_en`.)

- [ ] **Step 8: Delete `localizeStop` from `projection.ts`**

In `src/features/route-map/projection.ts`, delete the `localizeStop` function and its `import type { Stop } from './stops-schema'` line (the function lived ~line 109+ from Phase 4 T5).

- [ ] **Step 9: Wire the 8 `.astro` pages**

In each of `src/pages/index.astro`, `src/pages/en/index.astro`, `src/pages/route.astro`, `src/pages/en/route.astro`, `src/pages/journals/index.astro`, `src/pages/en/journals/index.astro`, `src/pages/journals/[slug].astro`, `src/pages/en/journals/[slug].astro`:

Replace the imports:
```typescript
// remove:
import { getCollection } from 'astro:content';   // keep if still used for journals
import { localizeStop } from '@/features/route-map/projection';
// add:
import { loadLocalizedStops } from '@/features/route-map/stops-loader';
```

Replace the cities fetch block:
```typescript
// before:
const stopEntries = await getCollection('stops');
const cities = stopEntries.map((e) => e.data).sort((a, b) => a.order - b.order).map((s) => localizeStop(s, locale));
// after:
const cities = await loadLocalizedStops(locale);
```

(Pages that don't render stops directly but call `localizeJournal` still need `cities` — keep the `const cities = await loadLocalizedStops(locale)` line and pass it to `localizeJournal`.)

- [ ] **Step 10: Refactor the test helper `load-stops.ts`**

Replace `tests/harness/lib/load-stops.ts` with a version that reads frontmatter via yaml + body via `parseStopBody`, returning the same `Stop[]` shape — WITHOUT importing `astro:content`:

```typescript
// Test-time loader. NODE-ONLY — no astro:content import.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
// @ts-expect-error pure mjs
import { parseStopBody } from '../../../src/features/route-map/stops-body-parser.mjs';
import type { Stop } from '../../../src/features/route-map/stops-loader';

const STOPS = path.join(process.cwd(), 'src/content/stops');
const PEOPLE = path.join(process.cwd(), 'src/content/people/met');

function split(raw: string) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  return { fm: parseYaml(m[1]) as any, body: m[2] };
}

export async function loadStops(requestedLocale: 'zh' | 'en' = 'zh'): Promise<Stop[]> {
  const files = (await readdir(STOPS)).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'));
  const people = new Map<string, any>();
  for (const pf of (await readdir(PEOPLE)).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'))) {
    const { fm, body } = split(await readFile(path.join(PEOPLE, pf), 'utf8'));
    // mirror the real loader: read the en bio sibling too (Codex plan-review should-fix)
    let bioEn: string | undefined;
    try { bioEn = (await readFile(path.join(PEOPLE, pf.replace(/\.md$/, '.en.md')), 'utf8')).trim() || undefined; } catch { /* none */ }
    people.set(fm.id, { fm, bio: body.trim() || undefined, bioEn });
  }
  const stops: Stop[] = [];
  for (const file of files) {
    const { fm, body } = split(await readFile(path.join(STOPS, file), 'utf8'));
    let bodyLocale: 'zh' | 'en' = 'zh';
    let md = body;
    if (requestedLocale === 'en') {
      const enFile = file.replace(/\.md$/, '.en.md');
      try { md = await readFile(path.join(STOPS, enFile), 'utf8'); bodyLocale = 'en'; } catch { /* fallback zh */ }
    }
    const parts = parseStopBody(md, bodyLocale);
    let event;
    if (fm.event) {
      let linkLabel = parts.event?.linkLabel;
      if (!linkLabel && requestedLocale === 'en' && fm.event.link) linkLabel = 'Read field log';
      event = { date: fm.event.date, summary: parts.event?.summary ?? '', link: fm.event.link, linkLabel };
    }
    stops.push({
      id: fm.id, order: fm.order, visited: fm.visited, isOrigin: fm.isOrigin, anchor: fm.anchor,
      label: requestedLocale === 'en' && fm.label_en ? fm.label_en : fm.label,
      lng: fm.lng, lat: fm.lat, altitude: fm.altitude, relationType: fm.relationType, themes: fm.themes,
      terrain: parts.terrain, terrainStep: parts.terrainStep, climate: parts.climate, challenge: parts.challenge,
      relationStats: parts.relationStats, event, expedition: parts.expedition,
      people: fm.people?.map((id: string) => {
        const p = people.get(id); if (!p) return null;
        return { id, name: requestedLocale === 'en' && p.fm.name_en ? p.fm.name_en : p.fm.name,
          role: requestedLocale === 'en' && p.fm.role_en ? p.fm.role_en : p.fm.role, image: p.fm.image,
          bio: requestedLocale === 'en' && p.bioEn ? p.bioEn : p.bio };
      }).filter(Boolean),
      photos: parts.photos?.map((p: any) => ({ src: p.src, alt: p.caption, caption: p.caption })),
    } as Stop);
  }
  return stops.sort((a, b) => a.order - b.order);
}
```

The existing spec uses `await loadStops()` (zh) in `beforeAll` — keep that call working (default arg `'zh'`).

- [ ] **Step 11: Minimal `validate-site.mjs` update (read new shape without crashing)**

In `scripts/validate-site.mjs`, the `loadStopsFromMd()` + checks block from Phase 4 reads OLD fields (`terrainEn`, `relationStatsEn`, `event.summary_en`, etc.) that no longer exist. For THIS task, reduce the stop checks to what the new frontmatter supports (id kebab, order contiguous, lng/lat finite, filename match, exactly one isOrigin, themes/relationType enums, people[] ids resolve to people-met files). Remove the now-invalid field checks (terrainEn etc.). The RICH body-shape checks come in T6 — for now just don't crash and keep the cross-collection journal-city check.

**Step 11a — fix `loadStopsFromMd()` to exclude `.en.md`** (Codex plan-review Blocker #1). The Phase 4 `loadStopsFromMd()` (around `scripts/validate-site.mjs:95-105`) filters `f.endsWith('.md') && !f.startsWith('_')` — which now ALSO matches the 9 new `*.en.md` siblings, so it would treat each English body file as a primary stop (no frontmatter → crash / bogus checks). Change the filter to:
```javascript
const files = fs.readdirSync(dir).filter(
  (f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'),
);
```

**Step 11b — delete the old inline-person object checks** (Codex plan-review should-fix). Phase 4's validator iterated `c.people` as OBJECTS with `.id` and `.image` (around `scripts/validate-site.mjs:286-304`). The new frontmatter `people` is `string[]` (ids). **Delete those object-shape loops entirely** and replace with the id-resolution check below.

**Step 11c — trim the now-invalid field checks.** In the stops loop, delete the checks referencing `city.terrainEn`, `city.terrainStepEn`, `city.climateEn`, `city.challengeEn`, `city.label_en` (presence), `relationStatsEn`, `city.event.summary_en`, `city.event.linkLabel_en`. Keep id/order/coords/filename/isOrigin/enum checks. Add:
```javascript
// people[] references (string ids) resolve to people/met files
const peopleDir = path.join(root, 'src/content/people/met');
const peopleIds = new Set(fs.readdirSync(peopleDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md')).map((f) => f.replace(/\.md$/, '')));
for (const c of routeCities) {
  for (const pid of c.people ?? []) {
    check(peopleIds.has(pid), `${c.id}: people ref "${pid}" has no src/content/people/met/${pid}.md`);
  }
}
```

- [ ] **Step 12: Run the gate**

```bash
pnpm exec astro check        # 0 errors
pnpm run check               # validate-site + astro check
pnpm run harness             # full both projects
```
Expected: all green (allow the known Phase 2 dispatchEvent flake; re-run those in isolation if they fail, per project precedent).

If `entry.body` is empty in the loader (see T3 note), switch the loader's zh-body read to `import.meta.glob('/src/content/stops/*.md', {query:'?raw',...})` minus `.en.md`, stripping frontmatter — and re-run.

- [ ] **Step 13: Delete the migration script**

```bash
rm scripts/migrate-stops-to-rich-body.mjs
```

- [ ] **Step 14: Commit (the whole cutover)**

```bash
git add -A
git status   # confirm: no scripts/migrate-* ; no .gitkeep ; docs/superpowers/ NOT staged
git restore --staged docs/superpowers 2>/dev/null || true
git commit -m "feat(stops): cutover to rich-body authoring — minimal frontmatter + markdown body + .en.md + people-met collection"
```

---

### Task 5: Loader-level tests + parser-already-covered hardening

**Files:**
- Modify: `tests/harness/route-map-coordinates.spec.ts`

The migrated files exist now, so loader-shape tests can run against real data via the refactored `loadStops(locale)` helper.

- [ ] **Step 1: Write the loader-level tests**

Append to `tests/harness/route-map-coordinates.spec.ts`:

```typescript
import { loadStops } from './lib/load-stops';

test('loadStops(zh) returns 9 stops in order with parsed body fields', async () => {
  const stops = await loadStops('zh');
  expect(stops.length).toBe(9);
  expect(stops.map((s) => s.order)).toEqual([0,1,2,3,4,5,6,7,8]);
  const liuzhou = stops.find((s) => s.id === 'liuzhou')!;
  expect(liuzhou.terrain).toContain('喀斯特');
  expect(liuzhou.relationStats.length).toBeGreaterThan(0);
  expect(liuzhou.expedition?.frontier).toContain('养鱼塘');
});

test('loadStops(en) localizes label + body via .en.md', async () => {
  const stops = await loadStops('en');
  const liuzhou = stops.find((s) => s.id === 'liuzhou')!;
  expect(liuzhou.label).toBe('Liuzhou');
  expect(liuzhou.terrain).toMatch(/Karst/i);
  expect(liuzhou.event?.linkLabel).toBeTruthy();
});

test('loadStops resolves people refs into ResolvedPerson', async () => {
  const stops = await loadStops('zh');
  const liuzhou = stops.find((s) => s.id === 'liuzhou')!;
  expect(liuzhou.people?.[0]?.id).toBe('wei-shifu');
  expect(liuzhou.people?.[0]?.name).toBe('韦师傅');
  expect(liuzhou.people?.[0]?.bio).toBeTruthy();
});

test('loadStops sets photo alt = caption (a11y compat)', async () => {
  const stops = await loadStops('zh');
  const withPhotos = stops.find((s) => (s.photos?.length ?? 0) > 0)!;
  expect(withPhotos.photos![0].alt).toBe(withPhotos.photos![0].caption);
});
```

> **Loader missing-`.en.md` fallback** at the unit level: the refactored `loadStops('en')` falls back to the zh body + `'Read field log'` link label when an `.en.md` is absent. Since all 9 migrated stops HAVE `.en.md`, exercise the fallback by reading a stop's zh body directly through `parseStopBody(body, 'zh')` and asserting label-default behavior is covered by the loader logic. (A dedicated fixture-based fallback test belongs in `stops-body-parser.spec.ts` if you want belt-and-suspenders, but the parser tests in T1 already cover zh-grammar parsing; the loader's linkLabel rule is unit-covered by the en test above plus the parser tests.)

- [ ] **Step 2: Run to verify PASS**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "loadStops" --project=chromium-desktop
```
Expected: 4 passed.

- [ ] **Step 3: Full route-map spec**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop
```
Expected: all pass (existing + 4 new).

- [ ] **Step 4: Commit**

```bash
git add tests/harness/route-map-coordinates.spec.ts
git commit -m "test(stops): loader-level tests (body parse, en localization, people resolve, photo alt)"
```

---

### Task 6: Rich body-shape validation in `validate-site.mjs`

**Files:**
- Modify: `scripts/validate-site.mjs`

Harden the validator beyond T4's minimum, using the shared `parseStopBody`.

- [ ] **Step 1: Import the parser + validate each stop's body**

At the top of `scripts/validate-site.mjs` (with the other imports):

```javascript
import { parseStopBody } from '../src/features/route-map/stops-body-parser.mjs';
```

In the stops validation area, after loading each stop file's frontmatter, also read the body and the `.en.md` sibling, and run the parser to surface shape errors as `check()` failures rather than throws:

```javascript
for (const { file, data } of stopFiles) {
  const raw = fs.readFileSync(path.join(stopsDir, file), 'utf8');
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  // H1 == label consistency (spec §6; parser treats H1 as cosmetic, so check here)
  const h1m = body.match(/^#\s+(.+?)\s*$/m);
  if (h1m) {
    check(h1m[1].trim() === data.label, `${file}: H1 "${h1m[1].trim()}" != frontmatter label "${data.label}"`);
  }
  try {
    const parts = parseStopBody(body, 'zh');
    // event link in body must agree with frontmatter event.link.
    // Stronger than "both present": a body link with NO frontmatter link, or a
    // mismatched one, is an error (spec §6 / §11).
    if (parts.event?.link) {
      check(
        parts.event.link === data.event?.link,
        `${file}: body event link (${parts.event.link}) != frontmatter event.link (${data.event?.link ?? 'missing'})`,
      );
    }
    // photos src exist under /public
    for (const p of parts.photos ?? []) {
      check(publicAssetExists(p.src), `${file}: photo src not in /public: ${p.src}`);
    }
  } catch (e) {
    check(false, `${file}: body parse failed — ${e.message}`);
  }
  // en sibling, if present, must parse with en grammar + H1 == label_en (when both present)
  const enFile = file.replace(/\.md$/, '.en.md');
  const enPath = path.join(stopsDir, enFile);
  if (fs.existsSync(enPath)) {
    const enRaw = fs.readFileSync(enPath, 'utf8');
    const enH1 = enRaw.match(/^#\s+(.+?)\s*$/m);
    if (enH1 && data.label_en) {
      check(enH1[1].trim() === data.label_en, `${enFile}: H1 "${enH1[1].trim()}" != frontmatter label_en "${data.label_en}"`);
    }
    try { parseStopBody(enRaw, 'en'); }
    catch (e) { check(false, `${enFile}: en body parse failed — ${e.message}`); }
  }
}
```

Also add people frontmatter checks:
```javascript
const peopleDir = path.join(root, 'src/content/people/met');
for (const pf of fs.readdirSync(peopleDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'))) {
  const praw = fs.readFileSync(path.join(peopleDir, pf), 'utf8');
  const pm = praw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  check(Boolean(pm), `${pf}: missing frontmatter`);
  if (pm) {
    const pd = parseYaml(pm[1]);
    check(pf === `${pd.id}.md`, `${pf}: filename must be ${pd.id}.md`);
    if (pd.image) check(publicAssetExists(pd.image), `${pf}: image not in /public: ${pd.image}`);
  }
}
```

- [ ] **Step 2: Run the validator**

```bash
pnpm run check:content
```
Expected: passes (count printed). Fix any data issues surfaced; don't weaken checks.

- [ ] **Step 3: Full gate**

```bash
pnpm run check
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-site.mjs
git commit -m "build(stops): validate stop body shape + people frontmatter via shared parser"
```

---

### Task 7: Final verification + finishing-a-development-branch

**Files:** none (verification + git).

- [ ] **Step 1: Clean-state + leftover grep**

```bash
git status --short                # clean (or only docs/superpowers/ untracked)
git log --oneline main..HEAD      # ~7 commits
rg "localizeStop|stopSchema\b" src/ tests/   # expect zero (localizeStop deleted; stopSchema renamed)
rg "from .*stops-schema" src/ tests/         # only StopFrontmatter / enum type imports remain
```
Fix any leftover before proceeding.

- [ ] **Step 2: Full harness**

```bash
pnpm run harness
```
Expected: pass on both projects. Known Phase 2 `dispatchEvent` flake under heavy parallel load — re-run the named tests in isolation if they fail (project precedent; see `memory/route-map-redesign.md`).

- [ ] **Step 3: Hand off via `superpowers:finishing-a-development-branch`**

Present the four options (merge locally / push + PR / keep / discard). Default recommendation: **push + PR** (Phase 1-4 pattern).

PR body should mention:
- spec path + 2 Codex review rounds
- editor-agnostic rich-body authoring (the Phase 4 follow-up the user asked for)
- two-file i18n (`.md` + `.en.md`), new `people-met` collection
- acceptance gate = `pnpm check`
- zero visible site behavior changes
- known scope-outs (spec §15)

---

## Notes for the implementer

- **TDD:** T1 (parser) and T5 (loader tests) are test-first. Run the failing test, see it fail, then implement.
- **The cutover (T4) is one commit by necessity** — old data + new schema can't coexist. Don't try to split it; gate at the end with `pnpm check` + harness.
- **`import.meta.glob` raw** is how `.en.md` sibling bodies are read (the collection glob excludes them). Verify `entry.body` is populated for the zh `.md`; if not, read zh bodies the same raw way (T3 note + T4 step 12).
- **YAGNI / scope-out (spec §15):** no per-stop pages, no AI integration, no other JSON collections, no `events[]`, no further i18n-suffix sweep. Stop and surface if tempted.
- **HERO slogan untouched.** `pnpm` only. `docs/superpowers/` never committed.
- **Codex review of THIS plan runs before T0** — address any Should-Fix in the plan first (project pattern since Phase 3).

---

## Self-review

**1. Spec coverage:**
- §3 two-file i18n ✓ (T4 emits `.md`+`.en.md`); people-met collection ✓ (T2 register, T4 populate); `bodyLocale`/`requestedLocale` ✓ (T3 loader, T5 tests); glob `pattern` negation ✓ (T2, T4 step 5); `Stop` type move ✓ (T3 create, T4 step 6 swaps); `photos[].alt=caption` ✓ (T3 assembly, T5 test); `localizeJournal` one-liner ✓ (T4 step 7); pure `.mjs` parser shared with validator ✓ (T1, T6); test helper no `astro:content` ✓ (T4 step 10).
- §5 frontmatter schema ✓ (T3 + T4 step 4). §6 body grammar ✓ (T1 parser). §7 sample ✓ (migration emits it; T4 step 3 spot-check). §8 person sample ✓ (T4). §9 transform ✓ (T3). §10 consumer changes ✓ (T4 steps 6-10). §11 validation ✓ (T4 step 11 minimal + T6 rich). §12 migration ✓ (T4 steps 1-3,13). §13 tests ✓ (T1, T5). §15 scope-out ✓ (Notes).

**2. Placeholder scan:** No TBD/TODO. Each code step has real code. The one judgement call (entry.body vs import.meta.glob) is given an explicit fallback path, not left open.

**3. Type consistency:** `Stop` defined once in `stops-loader.ts` (T3), imported everywhere after T4. `parseStopBody(markdown, bodyLocale)` signature consistent across T1 (def), T3 (loader call), T4 step 10 (test helper), T6 (validator). `loadLocalizedStops(requestedLocale)` consistent T3/T4. `loadStops(requestedLocale='zh')` consistent T4 step 10 / T5. `BodyParts` field names (terrain/terrainStep/climate/challenge/relationStats/event/expedition/photos) consistent parser↔loader↔test-helper.
