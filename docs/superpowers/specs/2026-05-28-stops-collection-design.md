# Phase 4: Stops as an Astro Content Collection — Design

> **Status:** Design spec (final), post-Codex rounds 1–3 (verdict: GO with verbatim Should-Fix inclusion).
> **Never commit this file** (project rule for `docs/superpowers/`).
> **Sub-skill required for implementation:** `superpowers:writing-plans` after user approves this spec.

## 1. Goal

Migrate `src/data/route-cities.ts` — the 9-element TypeScript constant that drives the route map — into `src/content/stops/*.md`, an **Astro Content Collection** of editor-agnostic Markdown files with YAML frontmatter. Once shipped:

- Adding / updating a stop = editing one `.md` file. No TypeScript edits.
- The schema (Zod in `src/content.config.ts`) + cross-collection validation (`scripts/validate-site.mjs`) catch malformed data at build time.
- Any editor works: VSCode, Obsidian, vim, an AI agent, a future web UI — they all produce/consume the same `.md` files governed by the same schema.
- All current site behavior, URLs, and UI are preserved bit-for-bit.

## 2. Non-goals

- Renaming `terrainEn` → `terrain_en` (or any other field-name harmonization). Today the codebase mixes `_en` and `En` suffixes; preserve that exactly, harmonize later.
- Extracting `people[]` or `photos[]` into their own collections. They stay inline in stops.
- Restructuring `event` into `events[]`. Phase 3 explicitly deferred this.
- Per-stop landing pages (`/route/<id>`).
- AI-assisted authoring. The schema enables it; this PR ships no integration.
- Migrating `heroes` / `team` / `partners` / `faq` / `equipment` JSON. Those stay as JSON `file()` loaders (`src/content.config.ts:54`).

## 3. Locked decisions (with citations)

- **Refs:** raw id strings, never `[[wiki-link]]`. Astro `reference()` doesn't validate target existence at schema-parse time. Cross-collection validation lives in `scripts/validate-site.mjs` (extend the existing journal pattern at `:266`).
- **Images:** `/public/*` URL strings only. Matches consumer expectations in `src/features/route-map/PhotoStrip.tsx:28`, `src/app/components/HomeContent.tsx:136`. Extend `publicAssetExists()` (`scripts/validate-site.mjs:130`) to cover stop `photos[].src` and `people[].image`.
- **i18n field naming:** preserve current mixed convention exactly. **No renames in this PR.** Consumers `src/features/route-map/CityPanel.tsx:402,435,454` read the camelCase fields directly today.
  - `_en` (snake) — `label`, `event.summary`, `event.linkLabel`, `name`, `role`, `bio`, `photos.caption`
  - `En` (camelCase) — `terrain`, `terrainStep`, `climate`, `challenge`, `relationStats`
- **Schema example fields:** all current `RouteCity` fields are preserved, **including `photos[].alt?: string`** (Codex R3 — `PhotoStrip.tsx:17` prefers `alt` over `caption` for the dialog/thumb a11y label; dropping it would silently regress).
- **Filename:** `<zero-padded-order>-<id>.md`, contiguous `0..N-1`. `order` is not a stable id; cancellation = remove or renumber.
- **`altitude` / `event.date` stay as strings.** Existing parsing/display treats them as strings; `event.date` includes ranges like `2026.05.05–07`.
- **`people[].id` is required when a `people` entry exists.** Bankable insurance against later extraction into a `people/met/` collection. The current `RouteCity.people[]` shape in `src/data/route-cities.ts:41` has no `id` field today — the migrated stop files **must assign** `wei-shifu` (柳州) and `maker-mo` (毕节). **Do NOT derive ids from image basenames** — `/people/ray-pipi.jpg` and `/people/haonan.jpg` are reused team placeholders (`team.json:23,33` use the same images for unrelated team members), not specific to these encounters.
- **Body:** optional, unconsumed in P4. Reserved for future per-stop landing pages.
- **`_template.md` exclusion:** glob pattern `'!(_*).md'` excludes underscore-prefixed files. Reliable for the flat `src/content/stops/*.md` layout. **If nested stop folders are ever introduced (e.g. `stops/yulin/yulin.md`), the exclude pattern must be reworked** — single-glob match doesn't recurse.

## 4. File layout

```
src/content/
  stops/
    _template.md          ← copy-paste source; excluded by '!(_*).md' loader pattern
    00-shenzhen.md
    01-guangzhou.md
    02-yangjiang.md
    03-yulin.md
    04-nanning.md
    05-liuzhou.md
    06-guiyang.md
    07-bijie.md
    08-chengdu.md
```

Photos remain at `/public/*` (no co-located image folder this PR).

## 5. Frontmatter schema (representative `03-yulin.md`)

```yaml
---
# ── identity / route order ─────────────────────────────────────
id: yulin
order: 3
visited: true
# isOrigin: true            # only on shenzhen
# anchor: true              # optional; pinned forward-looking label

# ── bilingual labels (_en) ─────────────────────────────────────
label: 玉林
label_en: Yulin

# ── geography / telemetry (camelCase En suffix) ────────────────
lng: 110.181
lat: 22.654
altitude: "80"
terrain: 桂东南大容山-六万大山丘陵盆地
terrainEn: Southeastern Guangxi Hilly Basin
terrainStep: 第三级阶梯
terrainStepEn: Third Terrain Step
climate: 南亚热带季风气候
climateEn: South Subtropical Monsoon
challenge: 盆地闷热积温环境,车载电池箱体防潮通风与电力分配验证
challengeEn: Stifling hilly basin climate; battery compartment cooling check

# ── activity classification (Phase 3) ──────────────────────────
relationType: education     # 'departure' | 'education' | 'community' | 'industry'
themes: [science]           # ThemeType[] from Phase 3
relationStats:
  - 走进玉东新区第三小学
  - 科普路展走进乡村校园
  - AI 硬件启蒙课
relationStatsEn:
  - Yudong Primary School Visit
  - Rural Campus Science Expo
  - AI Hardware Initiation

# ── on-site event (single; _en suffix on prose fields) ─────────
event:
  date: "2026.04.28"
  summary: 在玉林科技馆开展路展、AI 硬件工作坊...
  summary_en: Road show and AI hardware workshop at the Yulin S&T Museum...
  link: https://www.yuque.com/mouseart/gu0t4w/ktc4kr4o0w4auwiy?singleDoc
  linkLabel: 阅读领队日记
  linkLabel_en: Read leader's diary

# ── expedition log (Phase 2; optional nested; _en suffix) ──────
# expedition:
#   world: ...; world_en: ...
#   fire: ...; fire_en: ...
#   frontier: ...; frontier_en: ...

# ── people (inline; required id when entry exists) ─────────────
# people:
#   - id: wei-shifu            # REQUIRED. Stable. Banks future extraction.
#     name: 韦师傅
#     name_en: Mr. Wei
#     role: 三都新农人
#     role_en: New-gen farmer, Sandu
#     image: /people/ray-pipi.jpg
#     bio: ...
#     bio_en: ...

# ── photos (inline; alt + caption both supported) ──────────────
# photos:
#   - src: /heroes/karst-guangxi.webp
#     alt: 三都镇喀斯特地貌远景                 # used by a11y first
#     caption: 桂中喀斯特地貌
#     caption_en: Karst landscape, central Guangxi
---

(Markdown body intentionally empty in P4 — not consumed by any current
component. Reserved for future per-stop landing page; harmless if added.)
```

## 6. `localizeStop` — explicit per-field fallback semantics

Today `localizeCity` (`src/features/route-map/projection.ts:109`) only handles `label_en`, `event.summary_en`, `event.linkLabel_en`. The rest of the localization is scattered across consumers (`ExpeditionLog.tsx:15`, `PeopleStrip.tsx:15`, `PhotoStrip.tsx:17`, `CityPanel.tsx:363`) and they don't all behave the same way.

This PR consolidates all of it into a single `localizeStop(stop, locale)` function with **explicit, documented fallback semantics per field**. The contract:

**When `locale === 'zh'`:** return the stop unchanged. Done.

**When `locale === 'en'`:** for each localizable field, apply the field's fallback rule:

| field | English source | If English missing | Notes |
|---|---|---|---|
| `label` | `label_en` | fall back to `label` (zh) | matches current `localizeCity` |
| `terrain` | `terrainEn` | fall back to `terrain` (zh) | matches current `CityPanel` |
| `terrainStep` | `terrainStepEn` | fall back to `terrainStep` | matches current `CityPanel` |
| `climate` | `climateEn` | fall back to `climate` | matches current `CityPanel` |
| `challenge` | `challengeEn` | fall back to `challenge` | matches current `CityPanel` |
| `relationStats[i]` | `relationStatsEn[i]` if `relationStatsEn` defined and `[i]` exists | fall back to `relationStats[i]` | per-index, not array-as-whole |
| `event.summary` | `event.summary_en` | fall back to `event.summary` | matches current `localizeCity` |
| `event.linkLabel` | `event.linkLabel_en` | **fall back to the hardcoded English default `'Read field log'`** (i.e. `route.action.readFieldLog` i18n key in en dict), NOT to the zh linkLabel | preserves current `CityPanel:363` behavior — do NOT show zh link text on the en page |
| `expedition.world` / `.fire` / `.frontier` | `_en` siblings | fall back to zh | per-field |
| `people[i].name` / `.role` / `.bio` | `_en` siblings | fall back to zh | per-field |
| `photos[i].caption` | `caption_en` | fall back to zh `caption` | per-photo |
| `photos[i].alt` | **untouched** | n/a | `alt` is already locale-neutral text; `localizeStop` does not modify it. `PhotoStrip` uses `alt` before falling through to `caption` for a11y |
| all non-localized fields (`id`, `order`, `lng`, `lat`, `altitude`, `themes`, `visited`, `isOrigin`, `anchor`, `relationType`, `event.date`, `event.link`, `people[i].id`, `people[i].image`, `photos[i].src`) | untouched | n/a | |

After `localizeStop(stop, 'en')`, the returned object has the canonical key set (`label`, `terrain`, `event.summary`, ...) holding the English text. Consumers **stop branching on locale for stop-data fields** — they read one shape. The **per-field stop-data localization branches** in `ExpeditionLog.tsx`, `PeopleStrip.tsx`, `PhotoStrip.tsx`, and `CityPanel.tsx` become dead code and are deleted in the same PR. Static UI-label locale branches in those same files (e.g. `ExpeditionLog.tsx:29`'s `'NEW WORLD'` / `'THE FIRE'` labels, `CityPanel.tsx:379`'s locale-dispatched strings) are out of scope for this PR — those are i18n micro-strings (Tier 2 in the broader architecture proposal) and stay where they are.

**The `localizeStop` function MUST be unit-testable in node**, against a fixture stop with every localizable field set or absent, asserting each fallback rule above. Add those tests in `tests/harness/route-map-coordinates.spec.ts` next to the existing `localizeCity`-adjacent tests.

## 7. Cross-collection validation: move out of `astro check`

**Problem.** Today `src/content.config.ts:6,37` imports `routeCities` and `refine()`s the journal schema so journal `city` must match a stop id. Once stops becomes its own collection, importing a collection inside its sibling's config is fragile.

**Solution.** Drop that `refine()` from `content.config.ts`. Replicate the check in `scripts/validate-site.mjs` (precedent: journal city-id validation at `:255` / `:266`).

**Acceptance-gate caveat — must be stated in the spec, the PR description, and the implementation plan:**

> Raw `astro check` will no longer surface unknown journal city ids after this move. The **acceptance gate for builds is `pnpm check`** (`package.json:10`), which runs `pnpm run check:content` (= `node scripts/validate-site.mjs`) before `astro check`. Anyone running just `astro check` will miss the journal-city integrity check; CI / pre-deploy must use `pnpm check` or `pnpm build` (which depends on check).

New stops-collection validations added to `validate-site.mjs`:

- Every `id` is unique
- Every `order` is unique and contiguous `0..N-1`
- Filename exactly matches `<zero-padded-order>-<id>.md`; no `_*.md` entries
- `lng` ∈ [-180, 180], `lat` ∈ [-90, 90]
- `relationType` ∈ enum; `themes[]` items ∈ enum
- `event.link` parses as URL when present; `linkLabel` / `linkLabel_en` require `link`
- `photos[].src` and `people[].image` exist under `/public/` (extend `publicAssetExists()`)
- `people[].id` unique within a stop (across stops can repeat — same person, multiple stops)
- Exactly one `isOrigin: true` (shenzhen)

Plus the relocated cross-collection check:
- Every published journal's `city` must match a stop `id`

## 8. Consumer changes (full inventory)

Run `rg "route-cities|routeCities|RouteCity" src/ tests/ scripts/` before starting; the table below was built from Codex's grep in rounds 2 + 3.

| File | Today | After |
|---|---|---|
| `src/data/route-cities.ts` | TS const + `RouteCity`/`RouteCityEvent` interface + `ThemeType` | **DELETED.** `RouteCity` becomes `z.infer<typeof stopSchema>` from `src/content.config.ts`. `ThemeType` moves to `src/features/route-map/theme.ts` (Phase 3 helpers already live there). |
| `src/content.config.ts:4,6,37` | imports `routeCities`; `refine()` journal `city` | drop the import + the `refine`. Add `stops` collection schema. |
| `src/features/route-map/projection.ts:109` | `localizeCity` | replaced by `localizeStop` (§6). `projectCities` unchanged shape. |
| `src/features/route-map/types.ts` | re-exports `RouteCity`/`RouteCityEvent` | re-export from Zod-derived type. `ProjectedCity` shape unchanged. |
| `src/features/route-map/theme.ts:1` | imports `ThemeType` from `@/data/route-cities` | owns `ThemeType` locally now. |
| `src/features/route-map/ThemeFilter.tsx` | imports `ThemeType` | path unchanged after move; no code change. |
| `src/features/route-map/RoutePreview.tsx` | self-imports `routeCities` | accepts `cities` prop; home page passes it. |
| `src/features/route-map/ChinaRouteMap.tsx` | already accepts `cities` prop | unchanged. |
| `src/features/route-map/CityPanel.tsx` | reads `terrainEn`, `climateEn`, link-label fallback | reads localized canonical fields; `localizeStop` has already collapsed `_en`/`En` siblings. |
| `src/features/route-map/ExpeditionLog.tsx`, `PeopleStrip.tsx`, `PhotoStrip.tsx` | per-component locale branching | delete locale branching; receive already-localized props. |
| `src/app/components/HomeContent.tsx:11` | self-imports `routeCities` | accepts `cities` prop; `src/pages/index.astro` + `src/pages/en/index.astro` pass it. |
| `src/app/components/RouteContent.tsx:5` | self-imports `routeCities` | accepts `cities` prop; `src/pages/route.astro` + `src/pages/en/route.astro` pass it. |
| `src/app/components/JournalsContent.tsx:7` | self-imports `routeCities` for filter labels + telemetry cards | accepts `cities` prop; journals pages pass it. |
| `src/pages/index.astro`, `src/pages/en/index.astro` | don't fetch stops today | **new:** `const cities = (await getCollection('stops')).map(e => e.data).sort((a,b) => a.order - b.order).map(s => localizeStop(s, locale))`; pass through to `HomeContent` as prop. |
| `src/pages/route.astro:15`, `src/pages/en/route.astro` | already call `localizeJournal()`; do not fetch stops today | fetch + localize `cities` (same pattern as above); pass to `RouteContent` AND as the new required `cities` argument of `localizeJournal()`. |
| `src/pages/journals/index.astro:17`, `src/pages/en/journals/index.astro` | already call `localizeJournal()`; do not fetch stops today | fetch + localize `cities`; pass to `JournalsContent` AND to `localizeJournal()`. |
| `src/pages/journals/[slug].astro:28`, `src/pages/en/journals/[slug].astro` | call `localizeJournal()` which imports `routeCities` | journal **detail** pages fetch `cities` and pass to `localizeJournal(entry, cities, locale)`. `localizeJournal` no longer imports the data file. |
| `src/lib/journals.ts:60` | uses `routeCities` for city resolution | `localizeJournal()` signature gains a `cities` parameter (passed in by every caller above); no module-level import of the data. |
| `tests/harness/route-map-coordinates.spec.ts:3` | `import { routeCities } from '../../src/data/route-cities'` | replaced with `await loadStops()` from a new `tests/harness/lib/load-stops.ts`. |
| `scripts/validate-site.mjs` | validates journals against `routeCities` import | extended to also validate the `stops` collection itself (§7); the journal-city check stays but now reads stops via fs/yaml, not the deleted TS data file. |

## 9. Test-time MD loader (`tests/harness/lib/load-stops.ts`)

Promote `yaml@2.x` from transitive to direct dep (already in `pnpm-lock.yaml`). Add a Node-only loader:

```ts
// tests/harness/lib/load-stops.ts
import { readFile, readdir } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Returns parsed-frontmatter RouteCity-shaped objects, sorted by order.
// Skips files matching /^_/. Used by Playwright unit tests that previously
// imported routeCities directly. NOT for runtime/site code — the site uses
// getCollection() in .astro pages.
export async function loadStops(): Promise<RouteCity[]> { /* ... */ }
```

Location is **`tests/harness/lib/`** (not `src/lib/`) — Codex R3 reaffirms this is Node/fs-only test plumbing; placing it under `src/lib/` invites accidental app-side imports.

The flat-key parser in `scripts/validate-site.mjs:37` is NOT reused for stops — it doesn't handle nested `event` / `expedition` / `people[]` / `photos[]`.

## 10. Authoring workflow (editor-agnostic)

After this PR ships, the day-to-day for adding/updating a stop:

```
1. Open any editor on src/content/stops/        (VSCode, Obsidian, vim,
                                                  an AI agent, a web UI,
                                                  whatever you use)
2. Copy _template.md → save as 09-haerbin.md     (next stop)
3. Fill frontmatter from _template's comments    (manual or AI-generated)
4. Save → `pnpm dev` HMR shows the stop          (~1s feedback)
5. `pnpm check` locally (optional)               (runs validate-site +
                                                  astro check; same gate
                                                  as CI/deploy)
6. git commit + push → deploy.sh on push
```

The schema in `src/content.config.ts` + the `_template.md` comments + the validations in `scripts/validate-site.mjs` together form the **single authoring contract**. Any editor or agent that respects that contract works.

**Note on editor configs:** `.gitignore` will be checked for editor-config-folder coverage (`.obsidian/`, `.vscode/`, `.idea/`). Whatever's missing gets added. This is incidental tooling hygiene; it's not part of the design pillars.

## 11. What's preserved (testable invariants)

The full Playwright harness (`pnpm run harness`) MUST stay green on both `chromium-desktop` and `chromium-mobile` projects. Specifically:

- All Phase 1 tests (label placement, projection, zoom, recenter) — pass unchanged
- All Phase 2 tests (expedition log render, photo lightbox, fallback) — pass unchanged
- All Phase 3 tests (theme chips zh + en, lens dim/highlight, segment fade, toggle-off) — pass unchanged
- HERO slogan untouched, all home-page tests pass
- All visual smoke tests stable

New tests added in this PR:
- Unit: `localizeStop(stop, 'en')` per-field fallback for every rule in §6's table
- Unit: `loadStops()` returns 9 stops in `order` ascending, with frontmatter parsed
- Unit: `loadStops` skips `_*.md` files
- Browser-side: no new browser tests are strictly required (consumers' behavior is unchanged; existing harness already covers); add a guard-rail test that `getCollection('stops')` returns ≥9 entries.

## 12. Visible vs invisible changes

**Invisible to visitors** (the design's success criterion): zero pixel changes on `/`, `/route`, `/journals`, `/about`, or any other page. URLs unchanged. UI unchanged. HERO slogan untouched.

**Visible to the operator** (the design's value):
- No more TypeScript edits to add or update a stop
- Errors at edit time are clear (Zod + `validate-site.mjs` cite file + field)
- Each stop = one focused file in any editor
- Future phases (extracting people/photos into collections, AI-assisted authoring, per-stop landing pages) become incremental on this foundation

## 13. Scope-out (explicit deferrals)

Each of these is a candidate for a future Phase 5+ PR; none are in P4:

- Extracting `people[]` to `src/content/people/met/` collection (use the banked `id`s)
- Extracting `photos[]` to a media collection
- Migrating `heroes` / `team` / `partners` / `faq` / `equipment` to MD
- Per-stop landing pages (`/route/<id>`)
- Renaming `terrainEn` → `terrain_en` for i18n-suffix consistency
- AI-assisted authoring (Obsidian plugin / repo CLI / web UI / etc.)
- `events[]` restructure (multiple events per stop)
- ISO-date / numeric-altitude normalization

## 14. Open questions

None. Codex rounds 1–3 resolved every open question. Spec is ready for the user-review gate.

---

## Self-review (against spec writing skill)

- **Placeholder scan:** No TBD / TODO / "implement later" remaining. ✓
- **Internal consistency:** Field-name preservation rule stated in §3, applied in §5 example, enforced in §6's fallback table, surfaced as a non-goal in §2. `_template.md` exclusion stated in §3, applied in §4 layout. ✓
- **Scope check:** Single PR scope — stops only. Heroes/team/etc. explicitly scope-out in §2 and §13. ✓
- **Ambiguity check:** `localizeStop` for `event.linkLabel` previously ambiguous; §6's table now states the exact en-default fallback semantics (preserves current `CityPanel:363` behavior).
- **Acceptance gate:** stated explicitly in §7 — `pnpm check` not raw `astro check`.
- **Journal detail pages:** included in §8's consumer table.
- **People ids:** stated as `wei-shifu` / `maker-mo` in §3.
- **`photos[].alt`:** present in §5 example, called out in §3 locked decisions, untouched in §6 table.
