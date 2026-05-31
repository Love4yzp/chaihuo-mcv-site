# Stops Collection Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-05-28-stops-collection-design.md` (5 rounds of Codex review, final GO).
> **Project rule:** NEVER commit anything under `docs/superpowers/`. Do NOT modify the HERO slogan. `pnpm` only. Acceptance gate = `pnpm check` (not raw `astro check`).

**Goal:** Replace `src/data/route-cities.ts` (9-stop TypeScript constant) with `src/content/stops/*.md` — an editor-agnostic Markdown collection driven by Astro Content Collections + Zod, with all current site behavior preserved bit-for-bit.

**Architecture:** Add `stops` collection alongside existing `notes`/`journals` MD collections. Pages fetch via `getCollection('stops')`, localize once per page via new `localizeStop()` adapter, then pass plain-object `cities[]` props to React islands. Per-field locale branching in island leaf components (`ExpeditionLog`, `PeopleStrip`, `PhotoStrip`, `CityPanel`) is removed — they consume the already-localized shape. `localizeJournal()` gains a `cities` parameter so `src/lib/journals.ts` no longer module-imports the data. `scripts/validate-site.mjs` walks `.md` files via `yaml` (promoted to direct dep) instead of the deleted TS const; the journal-city cross-collection check moves from a Zod `refine` to `validate-site.mjs`.

**Tech Stack:** Astro 6 + React 19 islands + TypeScript strict + Tailwind v4 + Playwright harness (`pnpm run harness`, chromium-desktop + chromium-mobile). Adds `yaml@2.x` (already transitive in lockfile) as direct dep.

---

## File structure

- **Create** `src/content/stops/_template.md` — copy-paste source, leading underscore excludes from collection
- **Create** `src/content/stops/00-shenzhen.md` … `08-chengdu.md` — 9 stop files
- **Create** `src/features/route-map/stops-schema.ts` — Zod schema definition, single source of truth; imported by `src/content.config.ts`
- **Create** `tests/harness/lib/load-stops.ts` — test-time MD loader via `yaml` package
- **Modify** `src/content.config.ts` — register `stops` collection; drop `routeCities` import + journal `city` `refine` (T10)
- **Modify** `src/features/route-map/theme.ts` — own `ThemeType` definition
- **Modify** `src/features/route-map/projection.ts` — add `localizeStop()`; remove old `localizeCity()` (T10)
- **Modify** `src/lib/journals.ts` — `localizeJournal(entry, cities, locale)`; remove module-level `routeCities` + `findCity`
- **Modify** `src/pages/index.astro`, `src/pages/en/index.astro`, `src/pages/route.astro`, `src/pages/en/route.astro`, `src/pages/journals/index.astro`, `src/pages/en/journals/index.astro`, `src/pages/journals/[slug].astro`, `src/pages/en/journals/[slug].astro` — fetch `cities`, pass props
- **Modify** `src/app/components/HomeContent.tsx`, `RouteContent.tsx`, `JournalsContent.tsx` — accept `cities` prop
- **Modify** `src/features/route-map/CityPanel.tsx`, `ExpeditionLog.tsx`, `PeopleStrip.tsx`, `PhotoStrip.tsx` — strip per-field stop-data locale branches
- **Modify** `src/features/route-map/ChinaRouteMap.tsx`, `ThemeFilter.tsx`, `tests/harness/route-map-coordinates.spec.ts` — update `ThemeType` / `RouteCity` import paths
- **Modify** `scripts/validate-site.mjs` — read stops from `.md` files via `yaml`; add new stops checks; add relocated journal-city cross-collection check
- **Modify** `package.json` — promote `yaml` to direct dep
- **Delete** `src/data/route-cities.ts` (T10)
- **Modify** `.gitignore` — add `.obsidian/`

Test command throughout the plan:
- `pnpm exec astro check` — Zod schema typecheck (fast)
- `pnpm run check` — `validate-site.mjs` + astro check (acceptance gate)
- `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop` — unit + browser tests on the route-map spec
- `pnpm run harness` — full Playwright harness on both projects (final gate)

---

### Task 0: Create the feature branch

**Files:** none (git).

- [ ] **Step 1: Branch off main**

```bash
git checkout main
# origin = the deployment fork (Love4yzp/chaihuo-mcv-site); this is the deploy
# base. upstream remote also exists (Chaihuo-Makerspace) but Phases 1–3 shipped
# to origin/main, so we branch from origin.
git pull origin main
git checkout -b feature/stops-collection
git branch --show-current   # expect: feature/stops-collection
```

---

### Task 1: Add `stops` Zod schema (additive — `route-cities.ts` still imported)

**Files:**
- Create: `src/features/route-map/stops-schema.ts`
- Modify: `src/content.config.ts`
- Modify: `.gitignore` (add `.obsidian/`)

The schema lives in its own file so consumers (`src/lib/journals.ts`, validators) can import the type without dragging the whole content config.

- [ ] **Step 1: Create `src/features/route-map/stops-schema.ts`**

```typescript
// src/features/route-map/stops-schema.ts
import { z } from 'astro/zod';

const relationType = z.enum(['departure', 'education', 'community', 'industry']);
const themeType = z.enum(['science', 'maker', 'industry']);

const personSchema = z.object({
  // REQUIRED stable id, banks future extraction into a people/met/ collection
  id: z.string().regex(/^[a-z0-9-]+$/, 'people[].id must be kebab-case ascii'),
  name: z.string(),
  name_en: z.string().optional(),
  role: z.string().optional(),
  role_en: z.string().optional(),
  image: z.string().optional(),
  bio: z.string().optional(),
  bio_en: z.string().optional(),
});

const photoSchema = z.object({
  src: z.string(),
  // alt is locale-neutral and a11y-first; localizeStop leaves it untouched
  alt: z.string().optional(),
  caption: z.string().optional(),
  caption_en: z.string().optional(),
});

const expeditionSchema = z.object({
  world: z.string(),
  world_en: z.string().optional(),
  fire: z.string(),
  fire_en: z.string().optional(),
  frontier: z.string(),
  frontier_en: z.string().optional(),
});

const eventSchema = z.object({
  // string (not date) — current data includes ranges like "2026.05.05–07"
  date: z.string(),
  summary: z.string(),
  summary_en: z.string().optional(),
  link: z.url().optional(),
  linkLabel: z.string().optional(),
  linkLabel_en: z.string().optional(),
}).refine(
  // Either no linkLabel at all, or there's a link to label.
  // Catches "linkLabel without link" data errors at build time.
  (e) => !(e.linkLabel || e.linkLabel_en) || Boolean(e.link),
  { message: 'event.linkLabel / linkLabel_en require event.link' },
);

// PRESERVES the existing mixed naming convention exactly (terrainEn camelCase,
// label_en snake). See spec §3. Do NOT rename in this PR.
export const stopSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case ascii'),
  order: z.number().int().nonnegative(),
  visited: z.boolean(),
  isOrigin: z.boolean().optional(),
  anchor: z.boolean().optional(),

  label: z.string(),
  label_en: z.string().optional(),

  lng: z.number().gte(-180).lte(180),
  lat: z.number().gte(-90).lte(90),

  // strings — current parsing/display treats them as strings
  altitude: z.string(),
  terrain: z.string(),
  terrainEn: z.string(),
  terrainStep: z.string(),
  terrainStepEn: z.string(),
  climate: z.string(),
  climateEn: z.string(),
  challenge: z.string(),
  challengeEn: z.string(),

  relationType,
  themes: z.array(themeType),
  relationStats: z.array(z.string()),
  relationStatsEn: z.array(z.string()).optional(),

  event: eventSchema.optional(),
  expedition: expeditionSchema.optional(),
  people: z.array(personSchema).optional(),
  photos: z.array(photoSchema).optional(),
});

export type Stop = z.infer<typeof stopSchema>;
export type StopPerson = z.infer<typeof personSchema>;
export type StopPhoto = z.infer<typeof photoSchema>;
export type StopEvent = z.infer<typeof eventSchema>;
export type StopExpedition = z.infer<typeof expeditionSchema>;
export type StopRelationType = z.infer<typeof relationType>;
export type StopThemeType = z.infer<typeof themeType>;
```

- [ ] **Step 2: Register the collection in `src/content.config.ts`**

At the top of the file, add the import:

```typescript
import { stopSchema } from './features/route-map/stops-schema';
```

Inside the same file, before the `collections` export, add:

```typescript
const stops = defineCollection({
  loader: glob({
    base: './src/content/stops',
    // exclude underscore-prefixed files like _template.md
    pattern: '!(_*).md',
  }),
  schema: stopSchema,
});
```

Update the `collections` export at the bottom:

```typescript
export const collections = { notes, journals, equipment, team, faq, partners, heroes, stops };
```

**Do NOT** drop the `routeCities` import or the `cityIds.refine` yet — that breaks consumers. Cleanup happens in T10.

- [ ] **Step 3: Add `.obsidian/` to `.gitignore`**

Read `.gitignore`. Find a sensible spot near the bottom (after editor-config ignores) and add:

```
# Editor metadata (per editor; not per-repo)
.obsidian/
```

If `.obsidian/` is already in the file, skip this step.

- [ ] **Step 4: Verify schema compiles**

```bash
pnpm exec astro check
```
Expected: no errors. (The collection has zero MD files yet — that's fine, `glob` just returns an empty set.)

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/stops-schema.ts src/content.config.ts .gitignore
git commit -m "feat(stops): add Zod schema for stops Content Collection (additive)"
```

---

### Task 2: Migrate the 9 stops to `.md` files

**Files:**
- Create: `src/content/stops/_template.md`
- Create: `src/content/stops/00-shenzhen.md` through `08-chengdu.md`

A one-off Node migration script reads `routeCities` (the source TS const) and emits 9 `.md` files. Keeping the script avoids hand-editing 9 files and gives a reviewable single source for the transformation.

- [ ] **Step 1: Create the one-off migration script**

`scripts/migrate-stops-to-md.mjs`:

```javascript
#!/usr/bin/env node
// One-shot migration: src/data/route-cities.ts → src/content/stops/<order>-<id>.md
// Deletes itself after T2 commits — kept in repo only for the duration of the migration.
import fs from 'node:fs/promises';
import path from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import ts from 'typescript';
import vm from 'node:vm';

const root = process.cwd();

// Load routeCities by transpiling the .ts file in-memory (same pattern as
// scripts/validate-site.mjs:68)
async function loadRouteCities() {
  const src = await fs.readFile(path.join(root, 'src/data/route-cities.ts'), 'utf8');
  const compiled = ts.transpileModule(src, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: mod.exports,
    module: mod,
    require: () => { throw new Error('no runtime imports allowed'); },
  });
  return mod.exports.routeCities;
}

// Per Codex round 3: inline people IDs for the current 2 entries
const PEOPLE_ID_BY_NAME = {
  '韦师傅': 'wei-shifu',
  '创客 · 默': 'maker-mo',
};

function addPeopleIds(people) {
  if (!people) return people;
  return people.map((p) => {
    const id = PEOPLE_ID_BY_NAME[p.name];
    if (!id) throw new Error(`unknown person name: ${p.name} — add to PEOPLE_ID_BY_NAME`);
    return { id, ...p };
  });
}

function pad(n) { return String(n).padStart(2, '0'); }

async function main() {
  const cities = await loadRouteCities();
  const outDir = path.join(root, 'src/content/stops');
  await fs.mkdir(outDir, { recursive: true });

  for (const c of cities) {
    const data = { ...c };
    if (data.people) data.people = addPeopleIds(data.people);
    // Drop undefined keys for clean YAML
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

    const yaml = yamlStringify(data, {
      lineWidth: 0,           // no auto-wrap
      defaultKeyType: 'PLAIN',
      defaultStringType: 'PLAIN',
    });
    const file = `---\n${yaml}---\n`;
    const filename = `${pad(c.order)}-${c.id}.md`;
    await fs.writeFile(path.join(outDir, filename), file, 'utf8');
    console.log(`wrote ${filename}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Promote `yaml` to a direct dep so the script can use it**

```bash
pnpm add yaml
```

Verify `package.json` now lists `yaml` in `dependencies`.

- [ ] **Step 3: Run the migration script**

```bash
node scripts/migrate-stops-to-md.mjs
```
Expected output: `wrote 00-shenzhen.md` … `wrote 08-chengdu.md` (9 lines).

- [ ] **Step 4: Spot-check one file**

```bash
cat src/content/stops/03-yulin.md
```
Expected: starts with `---`, contains `id: yulin`, `order: 3`, `themes:` array, `event:` object. Compare visually to `src/data/route-cities.ts` for the `yulin` entry — same fields, same values.

- [ ] **Step 5: Create `_template.md`**

`src/content/stops/_template.md`:

```markdown
---
# Copy this file → rename to <next-order>-<id>.md → fill in.
# Schema: src/features/route-map/stops-schema.ts
# Author convention: keep _en suffix on label/event/expedition/people/photos.caption
#                    keep camelCase En suffix on terrain/terrainStep/climate/challenge/relationStats
# REQUIRED fields are marked with [required]. All others are optional but documented.

# [required] stable kebab-case id; matches filename slug after the order prefix
id: ""

# [required] integer >= 0; must be unique and contiguous 0..N-1 across all stops
order: 0

# [required] true once the vehicle has been there; false for planned stops
visited: false

# [optional] true only for shenzhen (the origin); exactly one stop has this
# isOrigin: false

# [optional] true to force-show the label as a forward-looking pinned anchor
# anchor: false

# [required] zh display label; [optional] _en sibling for English UI
label: ""
label_en: ""

# [required] WGS84 coordinates in degrees
lng: 0
lat: 0

# [required] all telemetry strings (current shape: altitude as string)
altitude: "0"
terrain: ""
terrainEn: ""
terrainStep: ""
terrainStepEn: ""
climate: ""
climateEn: ""
challenge: ""
challengeEn: ""

# [required] activity classification — drives /route filtering and panel chrome
relationType: education
themes: [science]
relationStats: []
relationStatsEn: []

# [optional] single on-site event
# event:
#   date: "YYYY.MM.DD"
#   summary: ""
#   summary_en: ""
#   link: "https://..."
#   linkLabel: ""
#   linkLabel_en: ""

# [optional] expedition log (Phase 2)
# expedition:
#   world: ""; world_en: ""
#   fire: "";  fire_en: ""
#   frontier: ""; frontier_en: ""

# [optional] inline people met on the road (id REQUIRED if entry exists)
# people:
#   - id: ""
#     name: ""
#     name_en: ""
#     role: ""
#     role_en: ""
#     image: "/people/...jpg"
#     bio: ""
#     bio_en: ""

# [optional] inline on-site photos (alt is locale-neutral a11y label)
# photos:
#   - src: "/heroes/...webp"
#     alt: ""
#     caption: ""
#     caption_en: ""
---

(Body intentionally empty — not consumed in Phase 4. Reserved for a future per-stop landing page.)
```

- [ ] **Step 6: Verify the collection loads**

```bash
pnpm exec astro check
```
Expected: no errors. (Schema accepts all 9 generated stops.)

If errors appear, they will be Zod messages naming the file + field. Fix by re-running the migration script (after fixing the script) — never hand-edit the generated `.md` files at this stage; the script is the source of truth.

- [ ] **Step 7: Delete the migration script**

The script is one-shot. Once the 9 files exist and `astro check` passes, the script's job is done.

```bash
rm scripts/migrate-stops-to-md.mjs
```

- [ ] **Step 8: Commit**

```bash
git add src/content/stops/ package.json pnpm-lock.yaml
git commit -m "feat(stops): migrate 9 route-cities to MD collection + _template.md"
```

---

### Task 3: Test-time loader + switch unit tests to it

**Files:**
- Create: `tests/harness/lib/load-stops.ts`
- Modify: `tests/harness/route-map-coordinates.spec.ts`

The unit tests at `tests/harness/route-map-coordinates.spec.ts:3` import `routeCities` directly. Replace with `loadStops()` so when `src/data/route-cities.ts` is deleted in T10, tests stay green.

- [ ] **Step 1: Create the loader**

`tests/harness/lib/load-stops.ts`:

```typescript
// Test-time MD loader. NODE-ONLY — do not import from src/ or runtime code.
// Site code uses getCollection('stops') in .astro pages; this helper exists so
// Playwright unit tests (which run outside Astro) can read the same source.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Stop } from '../../../src/features/route-map/stops-schema';

const STOPS_DIR = path.join(process.cwd(), 'src/content/stops');

export async function loadStops(): Promise<Stop[]> {
  const files = (await readdir(STOPS_DIR)).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_'),
  );
  const stops: Stop[] = [];
  for (const file of files) {
    const src = await readFile(path.join(STOPS_DIR, file), 'utf8');
    const match = src.match(/^---\n([\s\S]*?)\n---/);
    if (!match) throw new Error(`${file}: missing frontmatter`);
    stops.push(parseYaml(match[1]) as Stop);
  }
  return stops.sort((a, b) => a.order - b.order);
}
```

- [ ] **Step 2: Switch the spec's imports + assertions**

In `tests/harness/route-map-coordinates.spec.ts`, replace the data import (line 3 currently `import { routeCities } from '../../src/data/route-cities';`):

```typescript
import { loadStops } from './lib/load-stops';
import type { Stop as RouteCity } from '../../src/features/route-map/stops-schema';
```

(Type alias keeps the existing test-body variable name `RouteCity` valid.)

Then at the top of the file's test setup (next to `const sortedCities = ...` around line 21):

```typescript
const routeCities = await loadStops();
const sortedCities = [...routeCities].sort((a, b) => a.order - b.order);
```

But `await` at module top level is only allowed inside `test.beforeAll`. Use this instead:

Replace the existing `const sortedCities = ...` line with:

```typescript
let routeCities: RouteCity[] = [];
let sortedCities: RouteCity[] = [];
let expectedLabelIds: string[] = [];

test.beforeAll(async () => {
  routeCities = await loadStops();
  sortedCities = [...routeCities].sort((a, b) => a.order - b.order);
  expectedLabelIds = sortedCities
    .filter((city) => city.visited || city.isOrigin || city.anchor)
    .map((city) => city.id)
    .sort();
});
```

(`expectedLabelIds` was previously a module-top const — must move into `beforeAll`.)

- [ ] **Step 3: Run the affected tests to verify they still pass**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme tags|THEME_ORDER|cityMatchesTheme|countThemes" --project=chromium-desktop
```
Expected: 4 passed (the Phase 1 unit tests that consume `routeCities`).

- [ ] **Step 4: Run the full route-map spec on chromium-desktop**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop
```
Expected: 29 passed (all existing route-map tests still green; Phase 3 added one test).

- [ ] **Step 5: Commit**

```bash
git add tests/harness/lib/load-stops.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "test(stops): add loadStops() helper; switch unit tests off routeCities import"
```

---

### Task 4: Centralize route-map type identities (`ThemeType` + `RouteCity`) in `src/features/route-map/`

**Files:**
- Modify: `src/features/route-map/theme.ts` (own `ThemeType`)
- Modify: `src/features/route-map/types.ts` (own `RouteCity` as alias to `Stop`)
- Modify: `src/data/route-cities.ts` (re-export both types for back-compat until T11)
- Modify: `src/app/components/RouteContent.tsx`
- Modify: `src/features/route-map/ThemeFilter.tsx`
- Modify: `src/features/route-map/ChinaRouteMap.tsx`
- Modify: `src/features/route-map/RoutePreview.tsx`
- Modify: `src/features/route-map/CityPanel.tsx`
- Modify: `src/features/route-map/projection.ts`
- Modify: `src/lib/journals.ts` (type-only import update; the signature change happens in T6)

The cutover in T11 deletes `src/data/route-cities.ts`. **Six files currently import the `RouteCity` *type* from there** — Codex round 1 caught this. We move the canonical type definition to `src/features/route-map/types.ts` (where `ProjectedCity = RouteCity & {…}` already lives — the natural central seam), then update every type importer. `src/data/route-cities.ts` keeps a back-compat type re-export until T11 deletes the file. Same pattern for `ThemeType`.

- [ ] **Step 1: Add the `ThemeType` literal to `theme.ts`**

In `src/features/route-map/theme.ts`, near the top (after existing imports, before `THEME_ORDER`):

```typescript
export type ThemeType = 'science' | 'maker' | 'industry';
```

Then update the existing `import type { RouteCity, ThemeType }` line at the top of the same file to drop the `ThemeType` import (it's defined locally now):

```typescript
import type { RouteCity } from './types';
```

(Note: switch the source from `@/data/route-cities` to `./types` while you're here — `types.ts` becomes the canonical `RouteCity` home in Step 3.)

- [ ] **Step 2: Define canonical `RouteCity` alias in `src/features/route-map/types.ts`**

In `src/features/route-map/types.ts`, replace the existing `import type { RouteCity } from "@/data/route-cities";` (line 1) with the type re-aliased to `Stop`:

```typescript
import type { Stop, StopEvent } from './stops-schema';

export type RouteCity = Stop;
export type RouteCityEvent = StopEvent;

export type ProjectedCity = RouteCity & {
  cx: number;
  cy: number;
  elevationOffset: number;
  isLatest: boolean;
  showLabel: boolean;
  fontSize: number;
};

export type Rect = readonly [number, number, number, number];
```

(`ProjectedCity` definition unchanged — it just sees a different `RouteCity` underneath. Confirm by inspecting the existing file and preserving any lines I didn't show.)

- [ ] **Step 3: Re-export both types from `route-cities.ts` for back-compat**

In `src/data/route-cities.ts`, near the top (next to/replacing the existing `export type ThemeType = …` line and the `RouteCity`/`RouteCityEvent` interface declarations):

```typescript
// Type identities live in src/features/route-map/. This file keeps re-exports
// for back-compat until T11 deletes it.
export type { RouteCity, RouteCityEvent } from '@/features/route-map/types';
export type { ThemeType } from '@/features/route-map/theme';
```

Delete the old `interface RouteCity { … }` and `interface RouteCityEvent { … }` blocks — they are now defined by the Zod schema and re-exported here only. **Verify**: `pnpm exec astro check` should still pass after this step (the Zod-derived shape matches the old interface by construction since T1's schema was authored to match exactly; any drift surfaces here).

- [ ] **Step 4: Update direct type importers to the canonical homes**

For each file, change ONLY the type import path (not value imports):

- `src/features/route-map/RoutePreview.tsx:3` — change `from "@/data/route-cities"` → `from "./types"` (or `from "@/features/route-map/types"`)
- `src/features/route-map/CityPanel.tsx:4` — same
- `src/features/route-map/projection.ts:4` — same
- `src/features/route-map/ChinaRouteMap.tsx:4` — split the existing `import type { RouteCity, ThemeType } from "@/data/route-cities";` into:
  ```typescript
  import type { RouteCity } from "./types";
  import type { ThemeType } from "./theme";
  ```
- `src/app/components/RouteContent.tsx:5` — split the existing `import { routeCities, type ThemeType } from "@/data/route-cities";` into:
  ```typescript
  import { routeCities } from "@/data/route-cities";   // VALUE only — still pointed at the data file until T11
  import type { ThemeType } from "@/features/route-map/theme";
  ```
- `src/features/route-map/ThemeFilter.tsx:2` — change `from '@/data/route-cities'` → `from './theme'`
- `src/lib/journals.ts:3` — change `import { routeCities, type RouteCity } from '@/data/route-cities';` → split:
  ```typescript
  import { routeCities } from '@/data/route-cities';
  import type { RouteCity } from '@/features/route-map/types';
  ```
  (The full signature change of `localizeJournal` happens in T6; this step is type-only.)

After all edits, no remaining `import type { RouteCity, … } from "@/data/route-cities"` occurrences:

```bash
rg "import type.*from ['\"]@/data/route-cities['\"]" src/
```
Expected: empty result (the only remaining imports from that path are VALUE imports of `routeCities`, which T8 will remove).

- [ ] **Step 5: Verify build + harness**

```bash
pnpm exec astro check
```
Expected: 0 errors / 0 warnings.

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts --project=chromium-desktop
```
Expected: 29 passed.

- [ ] **Step 6: Commit**

```bash
git add src/features/route-map/theme.ts src/features/route-map/types.ts src/data/route-cities.ts src/app/components/RouteContent.tsx src/features/route-map/ThemeFilter.tsx src/features/route-map/ChinaRouteMap.tsx src/features/route-map/RoutePreview.tsx src/features/route-map/CityPanel.tsx src/features/route-map/projection.ts src/lib/journals.ts
git commit -m "refactor(stops): centralize RouteCity + ThemeType type identities in features/route-map/"
```

---

### Task 5: Implement `localizeStop()`

**Files:**
- Modify: `src/features/route-map/projection.ts`
- Modify: `tests/harness/route-map-coordinates.spec.ts` (unit tests)

Per spec §6, `localizeStop` is an explicit schema-aware adapter — not a generic `*_en` iterator. Every field rule is documented.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/harness/route-map-coordinates.spec.ts`:

```typescript
import { localizeStop } from '../../src/features/route-map/projection';

test('localizeStop returns input unchanged when locale is zh', async () => {
  const stops = await loadStops();
  const yulin = stops.find((s) => s.id === 'yulin')!;
  expect(localizeStop(yulin, 'zh')).toBe(yulin);
});

test('localizeStop collapses _en and En siblings into canonical keys when locale is en', async () => {
  const stops = await loadStops();
  const yulin = stops.find((s) => s.id === 'yulin')!;
  const en = localizeStop(yulin, 'en');
  // _en siblings
  expect(en.label).toBe(yulin.label_en);
  // En camelCase siblings
  expect(en.terrain).toBe(yulin.terrainEn);
  expect(en.terrainStep).toBe(yulin.terrainStepEn);
  expect(en.climate).toBe(yulin.climateEn);
  expect(en.challenge).toBe(yulin.challengeEn);
  // event nested fields
  expect(en.event!.summary).toBe(yulin.event!.summary_en);
  // relationStats per-index
  expect(en.relationStats).toEqual(yulin.relationStatsEn);
});

test('localizeStop preserves photos[].alt untouched in en (a11y-first locale-neutral)', async () => {
  const sample = {
    id: 't', order: 99, visited: true, label: '测试', lng: 0, lat: 0,
    altitude: '0', terrain: 't', terrainEn: 't', terrainStep: 's', terrainStepEn: 's',
    climate: 'c', climateEn: 'c', challenge: 'ch', challengeEn: 'ch',
    relationType: 'education' as const, themes: ['science' as const],
    relationStats: [],
    photos: [
      { src: '/x.jpg', alt: '一个 a11y 描述', caption: '中文标题', caption_en: 'English caption' },
    ],
  };
  const en = localizeStop(sample as never, 'en');
  expect(en.photos![0].alt).toBe('一个 a11y 描述');
  expect(en.photos![0].caption).toBe('English caption');
});

test('localizeStop falls back to zh for missing English fields (most fields)', async () => {
  const sample = {
    id: 't', order: 99, visited: true, label: '测试',
    lng: 0, lat: 0, altitude: '0',
    terrain: '泥泞', terrainEn: '',
    terrainStep: '第二级阶梯', terrainStepEn: '',
    climate: '湿润', climateEn: '',
    challenge: '挑战', challengeEn: '',
    relationType: 'education' as const, themes: ['science' as const],
    relationStats: ['一'], relationStatsEn: undefined,
  };
  const en = localizeStop(sample as never, 'en');
  expect(en.terrain).toBe('泥泞');
  expect(en.relationStats).toEqual(['一']);
});

test('localizeStop falls back event.linkLabel to hardcoded English default, NOT zh', async () => {
  const sample = {
    id: 't', order: 99, visited: true, label: '测试',
    lng: 0, lat: 0, altitude: '0',
    terrain: 't', terrainEn: 't', terrainStep: 's', terrainStepEn: 's',
    climate: 'c', climateEn: 'c', challenge: 'ch', challengeEn: 'ch',
    relationType: 'education' as const, themes: ['science' as const], relationStats: [],
    event: {
      date: '2026.01.01',
      summary: 'zh',
      summary_en: 'en summary',
      link: 'https://example.com',
      linkLabel: '阅读日记',     // present
      linkLabel_en: undefined,   // missing
    },
  };
  const en = localizeStop(sample as never, 'en');
  // Must NOT fall back to '阅读日记' (the zh string)
  expect(en.event!.linkLabel).not.toBe('阅读日记');
  // Must be the hardcoded English default
  expect(en.event!.linkLabel).toBe('Read field log');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "localizeStop" --project=chromium-desktop
```
Expected: FAIL — `localizeStop is not exported from projection`.

- [ ] **Step 3: Implement `localizeStop`**

In `src/features/route-map/projection.ts`, BELOW the existing `localizeCity` function, add:

```typescript
import type { Stop } from './stops-schema';

/**
 * Explicit schema-aware locale adapter for a stop. Spec §6.
 *
 * When locale === 'zh': returns the input unchanged.
 *
 * When locale === 'en':
 *   - collapses _en / En sibling fields into the canonical key
 *     (label_en → label, terrainEn → terrain, relationStatsEn[i] → relationStats[i],
 *      event.summary_en → event.summary, expedition.world_en → expedition.world,
 *      people[i].name_en → people[i].name, etc.)
 *   - photos[].alt is NEVER modified — it is a locale-neutral a11y label
 *   - event.linkLabel falls back to the hardcoded English default 'Read field log'
 *     (NOT to the zh linkLabel) — preserves current CityPanel.tsx behavior;
 *     observable behavior of t['route.action.readFieldLog'] in the en dict.
 *   - all other localizable fields fall back to the zh value if the English
 *     sibling is missing or empty.
 *
 * Non-localized fields (id, order, lng, lat, altitude, themes, visited, isOrigin,
 * anchor, relationType, event.date, event.link, people[].id, people[].image,
 * photos[].src) are passed through.
 */
export function localizeStop(stop: Stop, locale: Locale): Stop {
  if (locale === 'zh') return stop;

  const out: Stop = { ...stop };

  if (stop.label_en) out.label = stop.label_en;
  if (stop.terrainEn) out.terrain = stop.terrainEn;
  if (stop.terrainStepEn) out.terrainStep = stop.terrainStepEn;
  if (stop.climateEn) out.climate = stop.climateEn;
  if (stop.challengeEn) out.challenge = stop.challengeEn;

  if (stop.relationStatsEn && stop.relationStatsEn.length > 0) {
    out.relationStats = stop.relationStats.map(
      (zh, i) => stop.relationStatsEn?.[i] || zh,
    );
  }

  if (stop.event) {
    out.event = {
      ...stop.event,
      summary: stop.event.summary_en || stop.event.summary,
      // INTENTIONAL DUPLICATION: this hardcoded string ALSO exists in
      // src/i18n/route.ts:64 as t['route.action.readFieldLog'] = 'Read field log'
      // and in src/features/route-map/CityPanel.tsx:363 as the existing fallback.
      // Spec §6 requires localizeStop to own this fallback (otherwise the
      // consumer has to retain a locale-aware fallback step, defeating the
      // 'consumers see canonical fields' migration shape). Drift mitigation:
      // renaming the dict key WILL NOT propagate here — fix by making the dict
      // the single source of truth in a follow-up (see spec §13 scope-outs).
      // For P4 we accept the duplication; the harness covers the observable
      // behavior so a rename mismatch surfaces in tests.
      linkLabel: stop.event.link
        ? stop.event.linkLabel_en || 'Read field log'
        : stop.event.linkLabel,
    };
  }

  if (stop.expedition) {
    out.expedition = {
      ...stop.expedition,
      world: stop.expedition.world_en || stop.expedition.world,
      fire: stop.expedition.fire_en || stop.expedition.fire,
      frontier: stop.expedition.frontier_en || stop.expedition.frontier,
    };
  }

  if (stop.people && stop.people.length > 0) {
    out.people = stop.people.map((p) => ({
      ...p,
      name: p.name_en || p.name,
      role: p.role_en || p.role,
      bio: p.bio_en || p.bio,
    }));
  }

  if (stop.photos && stop.photos.length > 0) {
    out.photos = stop.photos.map((ph) => ({
      ...ph,
      // alt deliberately NOT modified — locale-neutral a11y
      caption: ph.caption_en || ph.caption,
    }));
  }

  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "localizeStop" --project=chromium-desktop
```
Expected: PASS (5 tests).

- [ ] **Step 5: Verify `astro check`**

```bash
pnpm exec astro check
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/route-map/projection.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "feat(stops): implement localizeStop with explicit per-field fallback semantics"
```

---

### Task 6: Update `localizeJournal()` signature

**Files:**
- Modify: `src/lib/journals.ts`

`localizeJournal` currently module-imports `routeCities` for city resolution. Add a `cities` parameter so it stops importing the data; callers pass the already-fetched stops. (`.astro` pages updated in T7.)

- [ ] **Step 1: Update `src/lib/journals.ts`**

Replace lines 1-3:

```typescript
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/index';
import type { Stop } from '@/features/route-map/stops-schema';
```

Replace lines 54-57 (the `findCity` function):

```typescript
/** Resolve a stable city id to its Stop within a provided cities[] (or undefined). */
export function findCity(cityId: string, cities: Stop[]): Stop | undefined {
  return cities.find((c) => c.id === cityId);
}
```

Replace the `localizeJournal` signature (lines 60-63):

```typescript
/** Apply locale-aware field selection to a journal for rendering. */
export function localizeJournal(
  entry: JournalEntry,
  cities: Stop[],
  locale: Locale,
): LocalizedJournal {
  const d = entry.data;
  const city = findCity(d.city, cities);
  /* …rest of the function body unchanged… */
```

(The rest of the function body — building `cityLabel`, the return object — stays identical; just the signature changed.)

- [ ] **Step 2: Verify `astro check` — should now fail at every caller**

```bash
pnpm exec astro check
```
Expected: FAIL at every page that calls `localizeJournal(entry, locale)` (now expects 3 args). The compile errors are the working list for T7.

- [ ] **Step 3: Do NOT commit yet**

This task only changes the function signature. The compile breaks until T7 updates all 8 pages. T6 + T7 land in one commit (next task does the commit).

---

### Task 7: Pages fetch `cities` + wire to islands and `localizeJournal`

**Files:**
- Modify: `src/pages/index.astro`, `src/pages/en/index.astro`
- Modify: `src/pages/route.astro`, `src/pages/en/route.astro`
- Modify: `src/pages/journals/index.astro`, `src/pages/en/journals/index.astro`
- Modify: `src/pages/journals/[slug].astro`, `src/pages/en/journals/[slug].astro`
- Modify: `src/app/components/HomeContent.tsx`, `RouteContent.tsx`, `JournalsContent.tsx`
- Modify: `src/features/route-map/RoutePreview.tsx` — accept `cities` prop (used by `HomeContent.tsx:375`); per Codex round 1 of the plan

Every page that consumes stops (directly or via `localizeJournal`) fetches via `getCollection('stops')`, runs each stop through `localizeStop(s, locale)`, and passes the resulting `cities` array to islands. Islands stop module-importing `routeCities`. `RoutePreview` is a nested island inside `HomeContent` — `HomeContent` forwards its `cities` prop down to `RoutePreview` (no separate page fetch needed).

- [ ] **Step 1: Update `src/pages/route.astro` (zh)**

Replace the existing frontmatter block (everything between the leading `---` and trailing `---`) with:

```typescript
export const prerender = true;

import { getCollection } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import RouteContent from '@/app/components/RouteContent';
import { getAllJournals, localizeJournal } from '@/lib/journals';
import { localizeStop } from '@/features/route-map/projection';
import type { Locale } from '@/i18n/index';
import routeDict from '@/i18n/route';

const locale = (Astro.currentLocale ?? 'zh') as Locale;
const t = routeDict[locale];

// Stops collection — localized once at page level
const stopEntries = await getCollection('stops');
const cities = stopEntries
  .map((e) => e.data)
  .sort((a, b) => a.order - b.order)
  .map((s) => localizeStop(s, locale));

const rawJournals = await getAllJournals();
const journals = rawJournals.map((j) => {
  const localized = localizeJournal(j, cities, locale);
  return {
    slug: localized.slug,
    title: localized.title,
    date: localized.date,
    status: localized.status,
    city: localized.city,
  };
});
```

Then update the body:

```astro
<BaseLayout title={t['route.pageTitle']} description={t['route.pageDesc']}>
  <RouteContent client:load cities={cities} journals={journals} locale={locale} t={t} />
</BaseLayout>
```

- [ ] **Step 2: Update `src/pages/en/route.astro` to match (identical code)**

Read `src/pages/en/route.astro` — if it's a thin wrapper, replace its frontmatter + body to match Step 1 verbatim. If it has additional content, preserve that and only update the imports / `cities` fetch / `journals` map / `<RouteContent>` call.

- [ ] **Step 3: Update `src/pages/index.astro` (home zh)**

Read the existing frontmatter. Add the same imports and `cities` fetch:

```typescript
import { getCollection } from 'astro:content';
import { localizeStop } from '@/features/route-map/projection';
/* (existing imports preserved) */

/* (existing locale const preserved) */

const stopEntries = await getCollection('stops');
const cities = stopEntries
  .map((e) => e.data)
  .sort((a, b) => a.order - b.order)
  .map((s) => localizeStop(s, locale));
```

Then in the body, pass `cities` to `<HomeContent>`:

```astro
<HomeContent client:load cities={cities} {... /* other existing props */} />
```

- [ ] **Step 4: Update `src/pages/en/index.astro` to match**

Same change as Step 3.

- [ ] **Step 5: Update `src/pages/journals/index.astro` (journals listing zh)**

Add the same `cities` fetch (Step 1 pattern). Update the `localizeJournal` call to pass `cities`:

```typescript
const localizedJournals = journalsCollection.map((entry) =>
  localizeJournal(entry, cities, locale),
);
```

Then pass `cities` to `<JournalsContent>`:

```astro
<JournalsContent client:load cities={cities} journals={localizedJournals} locale={locale} t={t} />
```

- [ ] **Step 6: Update `src/pages/en/journals/index.astro` to match**

- [ ] **Step 7: Update `src/pages/journals/[slug].astro` (journal detail zh)**

Add the `cities` fetch (Step 1 pattern). Update the `localizeJournal(entry, locale)` call to `localizeJournal(entry, cities, locale)`. No change to body unless the detail page renders other stop data.

- [ ] **Step 8: Update `src/pages/en/journals/[slug].astro` to match**

- [ ] **Step 9: Update `src/app/components/HomeContent.tsx` — accept `cities` prop**

Find the existing props type / function signature near the top of the file. Add `cities: RouteCity[]` (or `Stop`; whichever name the file already uses for stop entries) to the props interface.

Replace line 11 (`import { routeCities } from "@/data/route-cities";`) with:

```typescript
import type { Stop as RouteCity } from "@/features/route-map/stops-schema";
```

Find the existing `routeCities.map(c => localizeCity(c, locale))` (around line 77) and the `routeCities.filter` (around line 89) and the `routeCities.length` (around line 281). Replace `routeCities` with `cities` (the new prop). Drop the `localizeCity(c, locale)` wrapper — the page already localized each stop with `localizeStop`:

```typescript
// before (~line 77):
const localizedCities = useMemo(
  () => routeCities.map(c => localizeCity(c, locale)),
  [locale]
);
// after:
const localizedCities = cities;
// or just use `cities` directly downstream and delete the `localizedCities` const
```

Same idea for the filter and length references — they now read from `cities`.

If `localizeCity` is no longer referenced anywhere in this file, remove its import.

- [ ] **Step 10: Update `src/app/components/RouteContent.tsx` — accept `cities` prop**

Same pattern. Replace `import { routeCities }` with the cities prop. Replace the `routeCities.map(c => localizeCity(c, locale))` (around line 25) with `cities` directly.

- [ ] **Step 11: Update `src/app/components/JournalsContent.tsx` — accept `cities` prop**

Same pattern. Replace `import { routeCities }` (line 7) and the downstream usage with the `cities` prop.

- [ ] **Step 11b: Update `src/features/route-map/RoutePreview.tsx` — accept `cities` prop**

`RoutePreview` is rendered inside `HomeContent.tsx:375` as a nested island. Same pattern as the parent islands:
- Add `cities: RouteCity[]` to the props interface
- Replace the module-level `import { routeCities }` with the prop (any current `routeCities.map(...)` or `routeCities.filter(...)` calls become `cities.map(...)` / `cities.filter(...)`)
- `HomeContent` forwards `cities` to `<RoutePreview cities={cities} ...>` (already passes the prop from page-level in Step 9)
- Drop any internal `localizeCity` call — pages already localized once via `localizeStop` in their `.astro` frontmatter.

- [ ] **Step 12: Verify `astro check` is clean again**

```bash
pnpm exec astro check
```
Expected: 0 errors / 0 warnings.

If any errors remain, they will name the file + line. Fix the missed call site.

- [ ] **Step 13: Run the full harness on chromium-desktop**

```bash
pnpm run harness
```
Expected: 130/130 pass (same baseline as Phase 3 completion).

- [ ] **Step 14: Commit (T6 + T7 together)**

```bash
git add src/lib/journals.ts src/pages/index.astro src/pages/en/index.astro src/pages/route.astro src/pages/en/route.astro src/pages/journals/ src/pages/en/journals/ src/app/components/HomeContent.tsx src/app/components/RouteContent.tsx src/app/components/JournalsContent.tsx src/features/route-map/RoutePreview.tsx
git commit -m "refactor(stops): pages fetch stops + pass cities prop; localizeJournal takes cities"
```

---

### Task 8: Strip per-field stop-data locale branches from leaf consumers

**Files:**
- Modify: `src/features/route-map/CityPanel.tsx`
- Modify: `src/features/route-map/ExpeditionLog.tsx`
- Modify: `src/features/route-map/PeopleStrip.tsx`
- Modify: `src/features/route-map/PhotoStrip.tsx`
- Modify: `src/app/components/HomeContent.tsx` (per Codex round 1: stop-data locale branches at lines 330-343 — `terrain/terrainEn`, `climate/climateEn`, `challenge/challengeEn` — still exist after T7's wiring step)

Now that pages localize stops once via `localizeStop`, leaf consumers receive the canonical localized shape. The per-field `locale === 'en' ? ...En : ...` branches are dead code and removed. Per spec §6, **static UI-label locale branches stay** (e.g. `ExpeditionLog.tsx`'s `'NEW WORLD'` / `'THE FIRE'` labels, `CityPanel.tsx`'s locale-dispatched static strings).

- [ ] **Step 1: Strip locale branching from `CityPanel.tsx`**

Find all expressions like:

```typescript
locale === 'en' && city.label_en ? city.label_en : city.label
locale === 'en' && city.terrainEn ? city.terrainEn : city.terrain
locale === 'en' && city.event?.summary_en ? city.event.summary_en : city.event?.summary
```

Replace each with the canonical field:

```typescript
city.label
city.terrain
city.event?.summary
```

**Keep** locale branches for static UI strings (anything that's NOT reading a `_en`/`En` sibling). Example to KEEP:

```typescript
const heading = locale === 'en' ? 'EXPEDITION LOG' : '远征日志';   // keep
const action = locale === 'en' ? 'Read more' : '阅读更多';         // keep
```

The rule: if the right-hand side is a `*_en` / `*En` field from a stop, the branch is dead. If the right-hand side is a hardcoded string, the branch stays.

- [ ] **Step 2: Strip locale branching from `ExpeditionLog.tsx`**

Find branches reading `world_en` / `fire_en` / `frontier_en` from the stop's `expedition` and replace with `expedition.world` / `expedition.fire` / `expedition.frontier`. Keep the static label branches (`'NEW WORLD'` / `'THE FIRE'` / `'FRONTIER'` etc.).

- [ ] **Step 3: Strip locale branching from `PeopleStrip.tsx`**

Find branches reading `name_en` / `role_en` / `bio_en` from each person; replace with the canonical fields. Keep any static labels.

- [ ] **Step 4: Strip locale branching from `PhotoStrip.tsx`**

Find branches reading `caption_en` from each photo; replace with `caption`. **Do NOT remove `alt` handling** — `alt` is locale-neutral and `PhotoStrip` correctly prefers `alt` over `caption` for the a11y label (spec §3, §6).

- [ ] **Step 4b: Strip stop-data locale branches in `HomeContent.tsx`** (Codex r1 of plan)

At `src/app/components/HomeContent.tsx:330-343`, the route preview / telemetry section reads stop-data with locale branches like:

```typescript
locale === 'en' && city.terrainEn ? city.terrainEn : city.terrain
locale === 'en' && city.climateEn ? city.climateEn : city.climate
locale === 'en' && city.challengeEn ? city.challengeEn : city.challenge
```

These are stop-data fields, not UI labels, so they're dead code now that the page has run `localizeStop`. Replace each with the canonical field:

```typescript
city.terrain
city.climate
city.challenge
```

Same rule as the leaf components: keep any locale branches that read hardcoded UI strings; strip the ones that read `*_en`/`*En` from stop data.

- [ ] **Step 5: Verify `astro check`**

```bash
pnpm exec astro check
```
Expected: 0 errors / 0 warnings.

- [ ] **Step 6: Run full harness**

```bash
pnpm run harness
```
Expected: 130/130 pass. Both `chromium-desktop` and `chromium-mobile` projects.

- [ ] **Step 7: Commit**

```bash
git add src/features/route-map/CityPanel.tsx src/features/route-map/ExpeditionLog.tsx src/features/route-map/PeopleStrip.tsx src/features/route-map/PhotoStrip.tsx src/app/components/HomeContent.tsx
git commit -m "refactor(stops): consumers receive localized shape; drop per-field locale branches"
```

---

### Task 9: Migrate `scripts/validate-site.mjs` to read stops from MD

**Files:**
- Modify: `scripts/validate-site.mjs`

The existing validator at `scripts/validate-site.mjs:177` calls `loadTsModule('src/data/route-cities.ts')`. After T10 that file is deleted. Replace with a `yaml`-based MD loader that walks `src/content/stops/*.md`. All existing checks (lines 184-247) are preserved against the new source. Add new checks: `people[].id` uniqueness within a stop, contiguous order 0..N-1, filename matches `<order>-<id>.md`, exactly one `isOrigin: true`. The cross-collection journal `city` → stop id check already exists at `validate-site.mjs:255-267` (the `routeCityIds` set used by `validateJournals()`) — it's preserved as-is; the only change is that `routeCityIds` is now sourced from the MD-loaded stops, not from `loadTsModule`. (No second loop needed — Codex round 1 of plan flagged the duplicate-loop wording.)

**Validation-layer ownership** (Codex round 1 of plan asked for this to be explicit):

| Check | Owner | Why |
|---|---|---|
| Field types (string / number / array / enum) | Zod schema in `stops-schema.ts` (T1) | Native Zod; fails at `astro check` and at `getCollection()` |
| `relationType` ∈ enum, `themes[]` items ∈ enum | Zod (T1) | Native Zod |
| `lng` ∈ [-180,180], `lat` ∈ [-90,90] | Zod (T1) | Native Zod `.gte().lte()` |
| `event.link` is a URL | Zod `z.url()` (T1) | Native Zod |
| `linkLabel`/`linkLabel_en` require `link` | Zod `.refine()` on `eventSchema` (T1) — add to schema | Field-pair constraint, easiest at the schema level |
| Filename matches `<padded-order>-<id>.md` | `validate-site.mjs` (this task) | Filesystem concern; Zod doesn't see filenames |
| `order` contiguous `0..N-1` across all stops | `validate-site.mjs` (this task) | Cross-row, not per-row |
| Exactly one `isOrigin: true` | `validate-site.mjs` (this task) | Cross-row |
| `id` uniqueness across stops | `validate-site.mjs` (this task) | Cross-row |
| `people[].id` uniqueness within a stop | `validate-site.mjs` (this task) | Within-row but easier in node |
| Image paths exist under `/public/` | `validate-site.mjs` (this task) — `publicAssetExists()` | Filesystem concern |
| Journal `city` matches a stop id | `validate-site.mjs:255-267` (already there) | Cross-collection; previously a Zod `refine`, relocated here in T10 (drop the refine then) |

The `linkLabel↔link` pairing is enforced by the `.refine()` on `eventSchema` in T1 — no additional code is needed in T9 for that check.

- [ ] **Step 1: Add the stops loader near the top of `validate-site.mjs`**

After the existing helper functions (around line 90, after `loadTsModule`), add:

```javascript
import { parse as parseYaml } from 'yaml';

function loadStopsFromMd() {
  const dir = path.join(root, 'src/content/stops');
  const files = fs.readdirSync(dir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_'),
  );
  return files.map((file) => {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const m = src.match(/^---\n([\s\S]*?)\n---/);
    if (!m) throw new Error(`${file}: missing frontmatter`);
    const data = parseYaml(m[1]);
    return { file, data };
  });
}
```

- [ ] **Step 2: Replace the routeCities load + existing checks**

Find the existing block at line 177:

```javascript
const { routeCities } = loadTsModule('src/data/route-cities.ts');
```

Replace with:

```javascript
const stopFiles = loadStopsFromMd();
const routeCities = stopFiles.map((s) => s.data);
const stopFileById = new Map(stopFiles.map((s) => [s.data.id, s.file]));
```

The rest of the existing `routeCities`-driven checks (lines 184-247) now run against the MD-loaded array — the field names match, so most lines are unchanged. Where the old code referenced the TS file path in messages (e.g. `route-cities.ts:${city.id}: ...`), update to the new file:

```javascript
const ctx = `${stopFileById.get(city.id) ?? city.id}`;
check(/^[a-z0-9-]+$/.test(city.id), `${ctx}: id must be kebab-case ascii`);
// ...etc, replacing `route-cities.ts:${city.id}:` with `${ctx}:`
```

- [ ] **Step 3: Add the new stops-specific checks**

Just after the existing checks block, add:

```javascript
// Contiguous order 0..N-1
const orders = routeCities.map((c) => c.order).sort((a, b) => a - b);
for (let i = 0; i < orders.length; i++) {
  check(orders[i] === i, `stops: order must be contiguous 0..N-1; missing ${i} (got ${orders[i]})`);
}

// Filename matches <padded-order>-<id>.md
for (const { file, data } of stopFiles) {
  const expected = `${String(data.order).padStart(2, '0')}-${data.id}.md`;
  check(file === expected, `${file}: filename must be ${expected}`);
}

// Exactly one isOrigin: true
const origins = routeCities.filter((c) => c.isOrigin === true);
check(origins.length === 1, `stops: expected exactly one isOrigin (got ${origins.length})`);

// people[].id uniqueness within each stop; alt may be undefined but no implicit error
for (const c of routeCities) {
  if (!c.people) continue;
  const seen = new Set();
  for (const p of c.people) {
    check(p.id && /^[a-z0-9-]+$/.test(p.id), `${c.id}: people[].id must be kebab-case ascii`);
    check(!seen.has(p.id), `${c.id}: duplicate person id ${p.id}`);
    seen.add(p.id);
  }
}

// photos[].src and people[].image must exist under /public
for (const c of routeCities) {
  for (const ph of c.photos ?? []) {
    if (ph.src) check(publicAssetExists(ph.src), `${c.id}: photo src not found in /public: ${ph.src}`);
  }
  for (const p of c.people ?? []) {
    if (p.image) check(publicAssetExists(p.image), `${c.id}: person image not found in /public: ${p.image}`);
  }
}
```

- [ ] **Step 4: Verify the existing cross-collection check still works**

The existing journal-city validation already lives in `validateJournals()` at `scripts/validate-site.mjs:255-267`. It compares each journal's `city` field against `routeCityIds` (a Set built earlier from the `routeCities` array). With Step 2 above, `routeCities` is now the MD-loaded array — so the existing check works without changes.

**Do not add a second loop.** Just inspect the existing `validateJournals()` block and confirm it still references the same `routeCityIds` set / pattern. If the existing code currently uses `routeCities.map(c => c.id)` inline rather than a pre-built Set, leave that as-is.

The dropped Zod `refine` (removed in T10) was redundant with this existing check — its removal is safe because this script-level check already covers the same invariant.

- [ ] **Step 5: Run the validator**

```bash
pnpm run check:content
```
Expected: all checks pass (count printed at end, no failures listed). If any failures, fix the underlying data; do not weaken the checks.

- [ ] **Step 6: Run `pnpm check` (the full acceptance gate)**

```bash
pnpm run check
```
Expected: passes both `check:content` and `astro check`.

- [ ] **Step 7: Commit**

```bash
git add scripts/validate-site.mjs
git commit -m "build(stops): validate-site.mjs reads stops from MD; add stop-shape checks; relocate journal-city check"
```

---

### Task 10: Delete `route-cities.ts` and the dropped Zod refine

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/features/route-map/projection.ts`
- Delete: `src/data/route-cities.ts`

The closing-the-loop cutover. All consumers have moved off the TS const; deleting it is the last step.

- [ ] **Step 1: Drop the journal `refine` from `src/content.config.ts`**

In `src/content.config.ts`, remove these lines (currently at the top, around lines 4-6):

```typescript
import { routeCities } from './data/route-cities';

const cityIds = new Set(routeCities.map((c) => c.id));
```

Then in the `journals` schema (around line 37), replace:

```typescript
city: z.string().refine((id) => cityIds.has(id), {
  message: `Unknown city id. Must be one of: ${[...cityIds].join(', ')}`,
}),
```

with just:

```typescript
// Stable city id. Cross-collection existence check lives in
// scripts/validate-site.mjs (relocated 2026-05-28 — see plan T9).
city: z.string(),
```

- [ ] **Step 2: Remove the old `localizeCity` from `projection.ts`**

In `src/features/route-map/projection.ts`, delete the entire `localizeCity` function (lines 109-122 currently). The new `localizeStop` (added in T5) supersedes it.

If any file still imports `localizeCity`, `astro check` will surface it — chase those down (after T7's island wiring + T8's leaf-strip there should be no remaining `localizeCity` import; a leftover unrelated import may still exist, remove it if found).

- [ ] **Step 3: Verify no `routeCities` *value* imports remain**

After T8 every consumer accepts `cities` via prop. Before deletion confirm:

```bash
rg "import .* routeCities" src/ tests/ scripts/
```
Expected: **zero matches**. Type-only imports of `RouteCity` were already redirected to `@/features/route-map/types` in T4, so they don't reference the data file at all anymore.

If matches appear, those are missed consumers — fix them (passing `cities` from the page or via prop) before proceeding to Step 4.

- [ ] **Step 4: Delete the data file**

```bash
git rm src/data/route-cities.ts
```

- [ ] **Step 5: Run `pnpm check`**

```bash
pnpm run check
```
Expected: passes. No reference to the deleted file remains. (`astro check` would surface any unresolved import; `validate-site.mjs` enforces stop schema invariants from the MD files.)

If `astro check` reports unresolved imports, those are the missed consumers. Find them with:

```bash
rg "route-cities|routeCities|localizeCity" src/ tests/
```
Each remaining match must be fixed before commit.

- [ ] **Step 6: Run full harness**

```bash
pnpm run harness
```
Expected: 130/130 pass on both projects.

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts src/features/route-map/projection.ts
git commit -m "feat(stops): delete src/data/route-cities.ts; cutover complete"
```

---

### Task 11: Final verification + finishing-a-development-branch

**Files:** none (verification + git).

- [ ] **Step 1: Final clean-state checks**

```bash
git status --short    # expect: clean (or only docs/superpowers/ untracked)
git log --oneline main..HEAD   # expect: ~10 commits, one per task
rg "routeCities|route-cities" src/ tests/ scripts/   # expect: zero matches
```

If `rg` finds anything, fix the leftover before proceeding.

- [ ] **Step 2: Full harness pass**

```bash
pnpm run harness
```
Expected: 130/130 pass on both projects.

If a flake hits (Phase 2 `dispatchEvent` tests have a known race under heavy parallel load — see `memory/route-map-redesign.md`), re-run once. Two consecutive clean runs or one clean run + one with the known flake on those specific tests is acceptable per project precedent.

- [ ] **Step 3: Hand off via `superpowers:finishing-a-development-branch`**

Use the skill to present the four standard options (merge locally / push + PR / keep / discard). Default recommendation: **push + PR** (matches Phase 3's pattern).

The PR body should mention:
- the spec path (`docs/superpowers/specs/2026-05-28-stops-collection-design.md`)
- 5 rounds of Codex review on the design
- acceptance gate = `pnpm check` (not raw `astro check`); journal-city cross-collection check moved to `validate-site.mjs`
- zero visible site behavior changes
- known scope-outs (per spec §13)

---

## Notes for the implementer

- **TDD discipline.** Tasks 3, 5, 9 have explicit failing-test-first steps. Run the failing test, see it fail, then implement.
- **YAGNI / out of scope.** Per spec §13: no field renames (`terrainEn` stays), no `people[]` extraction, no `events[]` restructure, no per-stop landing pages, no AI integration, no other JSON collections. If any of these tempt you, stop and surface it.
- **Conventions** (`CLAUDE.md`): `pnpm` only; Lucide icons; brand/neutral tokens. None of those should be touched by this PR.
- **HERO slogan is untouched.** Verify before commit.
- **Acceptance gate.** Anywhere you run a quick check, prefer `pnpm check` over raw `astro check` — the former runs `validate-site.mjs` first and catches stop/journal integrity issues `astro check` no longer sees after T10.
- **Codex review of THIS plan should run before T0.** The user established this pattern in Phase 3 — once this plan file is saved, run `codex exec -s read-only` against it + the cited files before dispatching subagents. Address any Should-Fix items in the plan first.

---

## Self-review

**1. Spec coverage:**

- Spec §1 Goal ✓ (T1-T10 deliver it)
- Spec §2 Non-goals ✓ (called out in Notes section)
- Spec §3 Locked decisions ✓ (T1 schema preserves field names; T2 includes `_template.md` + filename prefix; T2 script assigns `wei-shifu`/`maker-mo`; T1 schema requires `people[].id`)
- Spec §4 File layout ✓ (T1 + T2)
- Spec §5 Frontmatter schema ✓ (T1 schema + T2 template)
- Spec §6 `localizeStop` per-field fallback ✓ (T5)
- Spec §7 Cross-collection validation move ✓ (T9 + T10)
- Spec §8 Consumer changes ✓ (T4-T8 + T10)
- Spec §9 Test loader ✓ (T3)
- Spec §10 Authoring workflow — documented but no code task (it's the result, not an action)
- Spec §11 Preserved invariants ✓ (full harness gate at T7, T8, T11)
- Spec §12 Visible vs invisible — covered by harness assertions
- Spec §13 Scope-out ✓ (called out in Notes)

**2. Placeholder scan:** No TBD / TODO / "implement later" / "handle edge cases" / "similar to Task N" patterns. Each task lists exact files, exact code, exact commands.

**3. Type consistency:**
- `Stop` (Zod-inferred) used consistently in stops-schema.ts, projection.ts (localizeStop), tests, journals.ts. ✓
- `RouteCity` type alias preserved at consumer sites via `import type { Stop as RouteCity }` to minimize island prop renames. ✓
- `localizeJournal(entry, cities, locale)` — 3-arg signature consistent across T6 (definition) and T7 (callers). ✓
- `cities: Stop[]` prop name consistent across HomeContent / RouteContent / JournalsContent + the .astro pages that pass it. ✓
