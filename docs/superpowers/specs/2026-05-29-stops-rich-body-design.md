# Phase 5: Stop Authoring with Rich Markdown Body — Design

> **Status:** Design spec (final), post-brainstorming Q1+Q2.
> **Never commit this file** (project rule for `docs/superpowers/`).
> **Sub-skill required for implementation:** `superpowers:writing-plans` after user approves this spec.

## 1. Goal

Phase 4 shipped the infrastructure (Astro Content Collection, Zod schema, `loadStops()`, `validate-site.mjs` migration, type centralization, page→island prop wiring) but kept all content in YAML frontmatter — opening `03-yulin.md` in any editor shows 100 lines of YAML, not a markdown document. **Phase 5 fixes the authoring shape.** Stop data lives in minimal frontmatter + heading-anchored markdown body sections; English translation lives in a sibling `*.en.md` file; people met on the road become their own collection (`src/content/people/met/`). **All visible site behavior is preserved bit-for-bit**, and React-island field-read code is unchanged — but the canonical home of the `Stop` type moves from `stops-schema.ts` to a new `stops-loader.ts`, so a handful of consumers (`types.ts`, `HomeContent.tsx`, the test spec) swap one `import type { Stop }` path. Full inventory in §10.

## 2. Non-goals

- Changing what consumers see — the runtime `Stop` shape they receive stays compatible with Phase 1-4 islands.
- Renaming or removing existing schema fields beyond the body extraction (incremental field churn is cheap post-Phase 5 — explicitly deferred).
- Per-stop landing pages (`/route/<id>`).
- AI-assisted authoring integration (Obsidian plugin / CLI / etc.).
- Migrating `heroes` / `team` / `partners` / `faq` / `equipment` JSON to MD.
- Touching the HERO slogan, Phase 1-4 features, URLs, or visible UI.

## 3. Locked decisions

From brainstorming Q1+Q2 + the comprehensive design message:

- **i18n strategy:** two-file. `<id>.md` (zh body + ALL frontmatter) plus optional `<id>.en.md` (en body only, no frontmatter). The loader carries TWO locale values per call — `requestedLocale` (what the consumer asked for, drives `linkLabel` default-string choice and which file we start from) and `bodyLocale` (the actual language of the body we ended up parsing — determines which set of canonical heading labels the parser expects). When `requestedLocale = 'en'` and the `.en.md` is missing, `bodyLocale` falls back to `'zh'` so the parser still recognizes the zh headings; `requestedLocale` stays `'en'`, which means `event.linkLabel` still receives the hardcoded English default `'Read field log'` (NEVER the zh link text — preserves the current `projection.ts:163` invariant).
- **People extraction:** new collection at `src/content/people/met/`. Each person is `wei-shifu.md` + `wei-shifu.en.md`. Stops reference people by id in frontmatter (`people: [wei-shifu]`).
- **Consumer contract preserved (with one type-import swap):** the `Stop` TS type that React islands READ stays field-compatible with Phase 4 (incl. `photos[].alt?: string` preserved — the assembler sets `alt = caption` so `PhotoStrip.tsx:17`'s `alt ?? caption` a11y chain keeps working). The transform produces a localized Stop directly — the per-field `localizeStop` from Phase 4 is subsumed by per-file selection. **However** the canonical home of the `Stop` type MOVES from `stops-schema.ts` (Phase 4) to a new `stops-loader.ts` (Phase 5) — three files swap their `Stop` / `StopEvent` import source: `src/features/route-map/types.ts`, `src/app/components/HomeContent.tsx`, anything else surfaced by `rg "from .*stops-schema"`.
- **Body sections (5):** `在地遥测` (telemetry) / `在地共创` (activities) / `现场记` (event) / `远征日志` (expedition, optional) / `照片` (photos, optional). en file uses canonical English headings: `Telemetry / Activities / Event / Expedition Log / Photos`.
- **Photo `alt` and `caption` collapsed:** markdown `![text](src)` — text is both a11y alt and visible caption; bilingualism via the two-file system.
- **Migration via one-shot Node script** (same pattern as Phase 4 T2): reads Phase 4 `.md` files, emits Phase 5 pairs + people files, deletes itself.
- **Parser strictness:** heading text must match canonical labels per locale. Mismatch = build fail with file:section citation.

**Locked carryovers from Phase 4:**

- `src/features/route-map/stops-schema.ts` file lives on (contents rewritten).
- `tests/harness/lib/load-stops.ts` test helper lives on (refactored to also parse body).
- `scripts/validate-site.mjs` extended with body-shape checks.
- `RouteCity` / `ThemeType` type identities in `src/features/route-map/types.ts` (no relocation).
- `yaml` direct dep.
- Acceptance gate = `pnpm check` (not raw `astro check`).

## 4. File layout

```
src/content/
  stops/
    _template.md              (rewritten — minimal frontmatter + skeleton body)
    _template.en.md           (NEW — en body skeleton)
    00-shenzhen.md            (frontmatter + zh body)
    00-shenzhen.en.md         (en body only — optional)
    01-guangzhou.md, 01-guangzhou.en.md
    02-yangjiang.md, 02-yangjiang.en.md
    03-yulin.md, 03-yulin.en.md
    04-nanning.md, 04-nanning.en.md
    05-liuzhou.md, 05-liuzhou.en.md     (the only ones with people right now)
    06-guiyang.md, 06-guiyang.en.md
    07-bijie.md, 07-bijie.en.md          (the only ones with people right now)
    08-chengdu.md, 08-chengdu.en.md

  people/met/                 (NEW collection)
    wei-shifu.md, wei-shifu.en.md
    maker-mo.md, maker-mo.en.md
```

Astro `glob` patterns (verified against installed Astro 6.3.1 `GlobOptions` API — `exclude` is NOT a supported field; use negation patterns inside `pattern`):
- Stops loader: `glob({ base: './src/content/stops', pattern: ['*.md', '!_*.md', '!*.en.md'] })` — `.en.md` files are NOT independent collection entries; the loader pairs them with their parent at read time.
- People loader: `glob({ base: './src/content/people/met', pattern: ['*.md', '!_*.md', '!*.en.md'] })` — same pairing model.

`.obsidian/` already in `.gitignore` from Phase 4.

## 5. Stop frontmatter schema (Zod)

`src/features/route-map/stops-schema.ts` (rewritten — only the FRONTMATTER fields):

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

**Note** what's NOT in frontmatter anymore: `terrain*` / `terrainStep*` / `climate*` / `challenge*` / `relationStats*` / `event.summary*` / `event.linkLabel*` / `expedition.*` / `photos[]` / inline `people[]` sub-fields. All moved to body.

## 6. Stop body grammar

Sections appear in this order. Each section's heading text must match exactly.

| section | required | zh heading | en heading | grammar |
|---|---|---|---|---|
| 1 | optional (cosmetic) | `# <label>` | `# <label>` | h1; if present, parser confirms text matches `label` / `label_en` from frontmatter |
| 2 | **required** | `## 在地遥测` | `## Telemetry` | list of EXACTLY 4 items, each `- <label>: <value>` in fixed order: 地形/阶梯/气候/极境挑战 (en: Terrain/Step/Climate/Challenge) |
| 3 | **required** | `## 在地共创` | `## Activities` | list of N items (N ≥ 1), each a free-text bullet → `relationStats[]` |
| 4 | optional | `## 现场记` | `## Event` | first paragraph → `event.summary`; optional link line `[<linkLabel>](<url>)` → `event.linkLabel` (the URL must match `event.link` in frontmatter) |
| 5 | optional | `## 远征日志` | `## Expedition Log` | exactly 3 h3 subsections in order: 新世界/火种/越界 (en: World/Fire/Frontier), each with 1 paragraph |
| 6 | optional | `## 照片` | `## Photos` | one or more markdown image lines `![<alt-aka-caption>](<src>)` |

**Parser failure modes** (build fails with clear file:line citation):
- Required section missing
- Required section out of order
- Heading text doesn't match the canonical label for the file's locale
- Telemetry not exactly 4 items, or item label not in the expected set
- Expedition log present but not exactly 3 sub-sections (or sub-section labels mismatch)
- Event has link line but URL ≠ frontmatter `event.link`
- Photo line is not a pure image embed

## 7. Concrete sample: stop `05-liuzhou`

### `src/content/stops/05-liuzhou.md`

````markdown
---
id: liuzhou
order: 5
visited: true
anchor: true
label: 柳州
label_en: Liuzhou
lng: 109.412
lat: 24.327
altitude: "90"
relationType: industry
themes: [industry]
event:
  date: 2026.04.30
  link: https://www.yuque.com/mouseart/gu0t4w/gzlp7usk115m7dns?singleDoc
people:
  - wei-shifu
---

# 柳州

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

[阅读领队日记](https://www.yuque.com/mouseart/gu0t4w/gzlp7usk115m7dns?singleDoc)

## 远征日志

### 新世界

桂中喀斯特盆地·三都镇的养殖与种植基地,泥泞起伏的农业一线。

### 火种

车载边缘 AI 摄像头与六轴机械臂,把实验室级的检测能力带到鱼塘边。

### 越界

把六轴机械臂,开进了养鱼塘。

## 照片

![桂中喀斯特地貌](/heroes/karst-guangxi.webp)
````

### `src/content/stops/05-liuzhou.en.md`

````markdown
# Liuzhou

## Telemetry

- Terrain: Central Guangxi Karst Basin
- Step: Third Terrain Step
- Climate: Middle Subtropical Monsoon
- Challenge: Bumpy agricultural dirt trails; edge AI camera dustproofing & image de-jitter

## Activities

- Sandu Agricultural Base Visit
- Dialogue with New Farmers
- AI Detection Scenario Discussion

## Event

Visit to the agricultural & aquaculture base in Sandu Town, Liuzhou — exchanging notes with new-generation farmers and the local tech community.

[Read leader's diary](https://www.yuque.com/mouseart/gu0t4w/gzlp7usk115m7dns?singleDoc)

## Expedition Log

### World

A karst-basin aquaculture & farming base in Sandu Town — the muddy front line of agriculture.

### Fire

On-board edge-AI cameras and a 6-axis arm bring lab-grade detection to the pond's edge.

### Frontier

We drove a 6-axis robotic arm into a fish pond.

## Photos

![Karst landscape, central Guangxi](/heroes/karst-guangxi.webp)
````

## 8. People frontmatter schema + concrete sample

`src/features/route-map/people-schema.ts` (NEW file):

```typescript
import { z } from 'astro/zod';

export const personFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  name_en: z.string().optional(),
  role: z.string().optional(),
  role_en: z.string().optional(),
  image: z.string().optional(),
});

export type PersonFrontmatter = z.infer<typeof personFrontmatterSchema>;
```

### `src/content/people/met/wei-shifu.md`

```markdown
---
id: wei-shifu
name: 韦师傅
name_en: Mr. Wei
role: 三都新农人
role_en: New-gen farmer, Sandu
image: /people/ray-pipi.jpg
---

在地养殖户,和团队探讨 AI 检测怎么用在水产养殖里。
```

### `src/content/people/met/wei-shifu.en.md`

```markdown
Local fish farmer exploring how AI detection fits aquaculture.
```

Body = bio paragraph(s). en sibling = en bio. Missing en file → bio falls back to zh.

## 9. The transform (raw inputs → consumer `Stop` shape)

**Module split** (per Codex round 1 should-fix #6 + #8 — the parser must be importable from Node-side test helpers and `validate-site.mjs`):

- `src/features/route-map/stops-body-parser.mjs` — **pure ESM**, NO `astro:content` / React / TypeScript-only-syntax imports. Exports `parseStopBody(markdown, bodyLocale)` → `BodyParts`. Importable from `.ts` (Astro side), `.ts` test helpers, and `.mjs` Node scripts (`validate-site.mjs`).
- `src/features/route-map/stops-loader.ts` — Astro-side, imports `getCollection` from `astro:content`, calls `parseStopBody`, resolves people, returns `Stop[]`.

`stops-loader.ts` defines and re-exports the canonical `Stop` type:

```typescript
// src/features/route-map/stops-loader.ts
import type { Locale } from '@/i18n/index';
import { parseStopBody } from './stops-body-parser.mjs';

export type Stop = {
  id: string;
  order: number;
  visited: boolean;
  isOrigin?: boolean;
  anchor?: boolean;

  label: string;           // already localized for requestedLocale
  lng: number;
  lat: number;
  altitude: string;

  relationType: StopRelationType;
  themes: StopThemeType[];

  // from body, already localized
  terrain: string;
  terrainStep: string;
  climate: string;
  challenge: string;
  relationStats: string[];

  event?: {
    date: string;
    summary: string;       // from body
    link?: string;
    linkLabel?: string;    // see fallback rule below
  };

  expedition?: {
    world: string;
    fire: string;
    frontier: string;
  };

  people?: ResolvedPerson[];

  // alt is preserved (assembler sets alt = caption) so PhotoStrip's
  // `alt ?? caption ?? 'photo'` a11y chain at PhotoStrip.tsx:17 keeps working
  // without component change.
  photos?: { src: string; alt?: string; caption: string }[];
};

export type StopEvent = NonNullable<Stop['event']>;   // for back-compat with anything that imported StopEvent
export type ResolvedPerson = {
  id: string;
  name: string;
  role?: string;
  image?: string;
  bio?: string;
};

export async function loadLocalizedStops(requestedLocale: Locale): Promise<Stop[]> { ... }
```

**Internal flow (per stop):**

1. Astro `getCollection('stops')` returns an entry with the zh body string + validated `StopFrontmatter`.
2. Look up the sibling `<id>.en.md` via the people / stops glob output (already loaded as part of the collection's `pattern` filtering).
3. **Decide `bodyLocale` and `bodyMarkdown` based on `requestedLocale`:**
   - `requestedLocale === 'zh'` → `bodyLocale = 'zh'`, `bodyMarkdown = entry.body` (the zh file).
   - `requestedLocale === 'en'` AND en sibling exists → `bodyLocale = 'en'`, `bodyMarkdown = en sibling body`.
   - `requestedLocale === 'en'` AND en sibling does NOT exist → `bodyLocale = 'zh'`, `bodyMarkdown = entry.body` (file-level fallback). **This is the critical bit:** `bodyLocale` follows the actual body, NOT the request. The parser uses `bodyLocale` to know which heading vocabulary (zh `## 在地遥测` vs en `## Telemetry`) to expect — otherwise the parser would fail on every en-with-zh-fallback case.
4. Run `parseStopBody(bodyMarkdown, bodyLocale)` → `BodyParts`.
5. **`event.linkLabel` resolution:**
   - If body's Event section has a link line → use its text as `linkLabel`.
   - Else if `requestedLocale === 'en'` AND `event.link` is set → `linkLabel = 'Read field log'` (hardcoded English default, NEVER the zh body's link text). This preserves the Phase 4 `projection.ts:163` invariant about not surfacing zh link strings on en pages.
   - Else → `linkLabel = undefined`.
6. Resolve each `people[]` id via `getCollection('people-met')`. Each person follows the same bodyLocale/requestedLocale logic for `bio`; `name`/`role` come from frontmatter `_en` fallback chain.
7. Assemble final `Stop`, **set `photos[].alt = caption`** for every photo (a11y compat — see §3), return.

This page-time helper pattern matches the project's existing style (cf. `src/lib/journals.ts:1` imports `getCollection`, `.astro` pages call it) — cross-collection lookups stay in helper code, NEVER in `content.config.ts` (Phase 4 already moved the analogous journal-city check out of schema and into `validate-site.mjs`).

**INTENTIONAL DUPLICATION** (carrying forward from Phase 4 spec §6): the hardcoded `'Read field log'` ALSO exists in `src/i18n/route.ts:64` as `t['route.action.readFieldLog']`. Same drift mitigation: the harness covers the observable behavior so a dict rename surfaces in tests. Tracked in §15 scope-outs.

## 10. Consumer changes

**Consumers that read field values from `Stop` — 0 behavioral change** (verified in Codex round 1):

- `CityPanel.tsx` reads `event.summary`, `event.linkLabel`, telemetry, `relationStats`, `challenge` — all preserved.
- `ExpeditionLog.tsx` reads canonical expedition fields — preserved.
- `PeopleStrip.tsx` reads `name/role/bio` — preserved (each ResolvedPerson has these post-resolve).
- `PhotoStrip.tsx` reads `photos[].alt ?? caption ?? 'photo'` for a11y — **preserved because the assembler sets `alt = caption`** (Codex r1 should-fix #2).
- `ChinaRouteMap.tsx`, `RoutePreview.tsx`, `RouteContent.tsx`, `JournalsContent.tsx` — all unchanged.

**Consumers that need a type-import swap only** (Codex r1 Blocker #1 — "0-change" was too strong, this is the truth):

- `src/features/route-map/types.ts` — currently `import type { Stop, StopEvent } from './stops-schema'` at line 1. Phase 5 swaps to `import type { Stop, StopEvent } from './stops-loader'` (or `import { type Stop } from './stops-loader'`). The `RouteCity = Stop` and `RouteCityEvent = StopEvent` aliases stay valid.
- `src/app/components/HomeContent.tsx:11` — currently `import type { Stop as RouteCity } from "@/features/route-map/stops-schema"`. Phase 5 swaps to `from "@/features/route-map/stops-loader"`.
- `tests/harness/route-map-coordinates.spec.ts:4` (if it imports `Stop` from `stops-schema`) — same swap.
- Any other site surfaced by `rg "from .*stops-schema"` at execution time.

**Consumers that need a one-line behavior change:**

- `src/lib/journals.ts:67` — currently reads `city.label_en ?? city.label`. Phase 5's `Stop.label` is already localized (since `cities` arg now comes from `loadLocalizedStops(locale)`), so simplify to just `city.label`. `localizeJournal(entry, cities, locale)` signature unchanged.

**`.astro` pages** (8 pages from Phase 4 T7): replace the chain `getCollection('stops').map(...).map(localizeStop)` with one call `await loadLocalizedStops(locale)`. Same data, less code per page.

**`src/features/route-map/projection.ts`:** `localizeStop` function deleted (subsumed by `loadLocalizedStops`).

**`tests/harness/lib/load-stops.ts`:** refactored. **Crucially does NOT import `astro:content` or `loadLocalizedStops` directly** (would pull Astro runtime into Playwright Node tests — Codex r1 should-fix #6). Instead, the test helper:
- Continues to use `fs` + `yaml` for frontmatter parsing (Phase 4 pattern preserved).
- Imports the pure `stops-body-parser.mjs` to parse bodies.
- Implements the same `bodyLocale` + en-fallback logic as the loader (it's a small amount of duplication; pure functions in `stops-body-parser.mjs` get most of the leverage).
- Returns `Stop[]` matching the loader's contract.

**`src/features/route-map/stops-schema.ts`:** Phase 5 rewrites the file to export ONLY `stopFrontmatterSchema`, `StopFrontmatter` (z.infer), `StopRelationType`, `StopThemeType`. The Phase 4 `Stop`/`StopEvent`/`StopPerson`/`StopPhoto`/`StopExpedition` type exports are removed; canonical homes are now `stops-loader.ts` (for `Stop`/`StopEvent`/`ResolvedPerson`) and inline in the consumer (for the inline photo type which never had a name).

## 11. Validation additions (`scripts/validate-site.mjs`)

New stop body-shape checks:
- Required sections (Telemetry, Activities) present in zh `.md`
- If `.en.md` exists, the same required sections present and in the same order
- Telemetry has exactly 4 items with labels matching the canonical set per locale
- Expedition (if present) has exactly 3 h3s with labels matching the canonical set per locale
- Event link text URL (if a link line present in body) equals frontmatter `event.link`
- Each `photos[]` line is a pure markdown image; `src` exists under `/public/` (extend `publicAssetExists()` already in use)

New stop ↔ people cross-collection check:
- Every id in stop's `people: [...]` resolves to an existing entry in `src/content/people/met/`

New person checks:
- `id` matches filename slug (`wei-shifu.md` ⇒ `id: wei-shifu`)
- `image` if present exists under `/public/`

**Parser sharing** (Codex r1 should-fix #8): the body parser MUST be the pure ESM `src/features/route-map/stops-body-parser.mjs` that `validate-site.mjs` can `import` directly. `validate-site.mjs` currently runs as plain Node ESM (`scripts/validate-site.mjs:1` shebang `#!/usr/bin/env node`); it has a `loadTsModule` helper but that rejects runtime imports (`scripts/validate-site.mjs:86`). Writing the parser as `.mjs` (not `.ts`) avoids any transpile step in the validator AND keeps the same module usable from the loader's `.ts` side (TS happily imports `.mjs`). The parser produces structured `BodyParts`; the validator inspects them for the shape rules in §11.

**Validation-layer ownership** (same model as Phase 4 §7):

| check | owner |
|---|---|
| frontmatter field types / regex / enums / lng-lat bounds / URL | Zod (stops-schema.ts, people-schema.ts) |
| body section presence/order/heading text | `validate-site.mjs` (this PR adds) |
| body telemetry/expedition exact-label match | `validate-site.mjs` |
| image existence under `/public/` | `validate-site.mjs` (already-extended `publicAssetExists`) |
| journal `city` → stop id | `validate-site.mjs` (relocated in Phase 4, unchanged) |
| stop `people[]` → person id | `validate-site.mjs` (NEW) |
| `id` ↔ filename consistency | `validate-site.mjs` (NEW for people; already there for stops) |

## 12. Migration script (one-shot)

`scripts/migrate-stops-to-rich-body.mjs` (deleted after run):

1. Read all current `src/content/stops/*.md` (Phase 4 YAML-only).
2. For each stop, extract the existing YAML fields and emit:
   - New `<order>-<id>.md` with minimal frontmatter + zh body sections, populated from `terrain` / `terrainStep` / `climate` / `challenge` / `relationStats[]` / `event.summary` / `event.linkLabel` / `expedition.world/fire/frontier` / `photos[].caption`.
   - New `<order>-<id>.en.md` (only if all corresponding `_en`/`En` fields are populated) with en body using `terrainEn` / `climateEn` / `relationStatsEn[]` / `event.summary_en` / etc.
   - Stop frontmatter `people: [<ids>]` populated from inline people of Phase 4.
3. Extract Phase 4's inline people entries to `src/content/people/met/<id>.md` and `.en.md`. Existing Phase 4 ids: `wei-shifu` (liuzhou), `maker-mo` (bijie). bio paragraphs go into bodies.
4. Rewrite `_template.md` and `_template.en.md` to match the new shape.
5. Delete itself after `pnpm check` + targeted unit tests pass.

## 13. Testing

Unit tests (`tests/harness/route-map-coordinates.spec.ts` and a new `tests/harness/stops-body-parser.spec.ts`):

**Pure parser tests** (`parseStopBody`, importable as pure ESM):
- Extracts each section correctly from a representative zh sample.
- Returns the same structural shape for the en sample.
- Missing optional sections (expedition, photos) → absent in result (not error).
- Missing required section → throws with file:section citation.
- Required section out of order → throws.
- Telemetry with non-canonical label → throws.
- Event link URL mismatch with frontmatter → throws.

**Loader-level tests** (the `bodyLocale` / `requestedLocale` story — Codex r1 must-fold-in):
- Stop with `.en.md` present, `requestedLocale='en'` → returns Stop with English content, `event.linkLabel` from the en body's link text.
- Stop with `.en.md` MISSING, `requestedLocale='en'` → returns Stop with zh body content (parser was invoked with `bodyLocale='zh'`), `event.linkLabel = 'Read field log'` (NEVER the zh body's link text). Test asserts both pieces of this contract.
- Stop with `.en.md` MISSING, `requestedLocale='en'`, frontmatter has no `event.link` → `event.linkLabel` is `undefined`.
- Stop with `.en.md` present but missing the Event section → `linkLabel = undefined`, but the rest of the body is still en.
- `loadLocalizedStops('zh')` and `loadLocalizedStops('en')` against the 9 migrated stops returns `Stop[]` matching the existing `Stop` type and snapshot.

**People resolution tests:**
- Stop `liuzhou`'s `people: [wei-shifu]` resolves to a `ResolvedPerson` with `wei-shifu`'s name/role/image/bio.
- En person resolution falls back the same way as stops when `.en.md` is missing.

**Photo `alt` compat test:**
- `Stop.photos[i].alt === Stop.photos[i].caption` after assembly (Codex r1 should-fix #2 — preserves `PhotoStrip.tsx:17` a11y chain).

Browser harness:
- Full `pnpm run harness` 130+/130+ pass on both projects, unchanged from Phase 4 baseline.
- The existing Phase 2 `dispatchEvent` parallel-load flake is known; passes in isolation.

## 14. What's preserved (testable invariants)

Same Phase 4 list:
- All Phase 1/2/3 features pixel-identical.
- HERO slogan untouched.
- All URLs unchanged.
- `Stop` shape for React islands compatible.
- `pnpm check` remains acceptance gate.
- `validate-site.mjs` still owns cross-collection validation.

## 15. Scope-out (explicit deferrals)

Each is a future-PR candidate; none belong in Phase 5:

- Per-stop landing pages (`/route/<id>` renders the body markdown).
- AI-assisted authoring (Obsidian plugin / CLI / web UI).
- Migrating `heroes` / `team` / `partners` / `faq` / `equipment` JSON collections.
- Field name harmonization (`terrainEn → terrain` once it's body-only — actually this PR DOES rename since the body is locale-specific; but no further i18n-suffix sweep).
- ISO date / numeric altitude normalization.
- Photo `alt`/`caption` re-separation (kept collapsed in this PR).
- Reorganizing the `Stop` consumer type (e.g. flattening `expedition`).
- `events[]` array (multiple events per stop).
- `people/met/` ↔ `people/team` cross-references.

## 16. Open questions

None. All forks resolved by brainstorming Q1+Q2 + the comprehensive design message.

---

## Self-review

- **Placeholder scan:** No `TBD` / `TODO` / "implement later" / vague requirements. Each section has concrete content or explicit deferral.
- **Internal consistency:** Section order in §6 grammar matches sample in §7. Frontmatter schema in §5 matches sample frontmatter in §7. en file rules in §3 match parser fallback in §9.
- **Scope check:** Single PR scope — only stops + new people collection. Other collections explicitly scope-out in §2 and §15.
- **Ambiguity check:** `linkLabel` fallback semantics for missing en explicitly specified in §9 (hardcoded `'Read field log'`, matches Phase 4 §6). en-file missing fallback explicitly specified in §3 (file-level fallback to zh). Photo alt/caption collapse explicit in §3.
- **Acceptance gate:** `pnpm check` stated in §3 carryovers and §11.
- **Migration:** one-shot script in §12 with the exact 5-step process.
