# Route Map — Theme Filter Chips (Phase 3) Design

> **Status:** Approved direction, pending user review of this spec.
> **Never commit this file** (lives under `docs/superpowers/`, per project rule).

**Goal:** Let a visitor view the route map through one "lens" — a row of theme chips
that highlights the stops matching the chosen theme and dims the rest, while the
continuous horse-shaped route stays visible. A single stop can belong to several themes.

**Soul / framing:** The project's core metaphor is fire (柴火 / 普罗米修斯 / "把科技之火
带到未抵达之地与人"). The chips answer **"火种落在哪种土壤?"** — the kinds of ground the
tech-fire landed on. Not dry back-office categories; not subjective narrative threads.

---

## 1. Theme taxonomy

Three themes (extensible), parallel two-character domain words, unified by the fire framing:

| key (stable) | zh label | en label | meaning | Lucide icon |
|---|---|---|---|---|
| `science` | 科普 | STEM | 学校 / 科技馆 / 工作坊 — 把 AI 带给下一代和公众 | `GraduationCap` |
| `maker` | 创客 | Makers | 在地创客 / 个体创造者 — 把火种交给在地创造者 | `Wrench` |
| `industry` | 产业 | Industry | 农业 / 养殖 / 车间 — 把实验室能力开进真实生产现场 | `Factory` |

- **Order is fixed:** `science`, `maker`, `industry` (plus a leading **全部 / All** chip).
- **The origin (深圳) is exempt** — it is not an activity theme. Its `themes` is `[]`; under any
  lens it stays at normal opacity (neither highlighted nor dimmed) and keeps its origin marker.
- Naming deliberately uses **科普** (not 科创) so it (a) covers museums + teacher training, not
  just campuses, (b) reads easily for a 小红书/公众号 audience, (c) does not visually collide
  with **创客** (both 科创 and 创客 share 创). **创客** is kept — it is 柴火's brand DNA.

en label for `science` is **STEM** (short, recognizable); tweakable.

---

## 2. Data model

Add one multi-valued field to `RouteCity` (`src/data/route-cities.ts`). Keep `relationType`
unchanged — it still drives `CityPanel` content; the new field is the filter source of truth.

```ts
export type ThemeType = 'science' | 'maker' | 'industry';

export interface RouteCity {
  // ...existing fields...
  /** Activity themes this stop belongs to (multi-valued). Origin has []. */
  themes: ThemeType[];
}
```

`ProjectedCity` is `RouteCity & {...}` (see `types.ts`), so `themes` flows through the
projection/localization pipeline automatically — **no change needed in `types.ts`,
`projection.ts`, or `localizeCity`** beyond the field existing on `RouteCity`.

**Per-city `themes` (authored now, derived from real activities):**

| city | themes | why |
|---|---|---|
| 深圳 shenzhen | `[]` | origin (exempt) |
| 广州 guangzhou | `['science']` | 科技中心路展 + AI 硬件工作坊 |
| 阳江 yangjiang | `['science']` | 科技馆 + 青少年互动 |
| 玉林 yulin | `['science']` | 科技馆 + 走进小学 |
| 南宁 nanning | `['science']` | 广西科技馆 + 教师培训 |
| 柳州 liuzhou | `['industry']` | 三都镇养殖种植基地 |
| 贵阳 guiyang | `['science','maker']` | 学校/师范/贵大 (science) + 与本地创客面对面 (maker) |
| 毕节 bijie | `['maker']` | 创客默 |
| 成都 chengdu | `['maker']` | 创客社区合伙人 |

**Chip counts (over all cities):** 科普 **5** · 创客 **3** · 产业 **1**.

---

## 3. Interaction model (decided)

- **Single-select.** `activeTheme: ThemeType | null`. `null` = 全部 (everything normal).
- Click a theme chip → it becomes the active lens. Click the active chip again (or the 全部
  chip) → back to `null`.
- **Dim, don't hide.** Hiding stops would fragment the single continuous route path and break
  the horse shape. So when a lens is active:
  - **Matched** non-origin cities: stay at full opacity, marked `data-theme-match="true"`. The
    visual pop comes from the rest dimming; a subtle brand ring on matched dots is allowed but
    not required.
  - **Non-matched** non-origin cities: dimmed (opacity ~0.25), marked `data-dimmed="true"`;
    their labels dim with them.
  - **Origin (深圳):** exempt — stays at normal opacity, never `data-dimmed`.
  - **Route segments** (the city-connecting strokes): the whole segment layer is faded
    uniformly (wrap the segment loop in one `<g>` whose opacity drops to ~0.2 while a lens is
    active). Per-segment matching is out of scope. The faint horse watermark is left as-is.
- The filter is a **map-only visual emphasis layer.** It does **not** change zoom, and does
  **not** change which city is selected in the panel. The panel and the filter are independent.
  A non-matching selected city dims like any other (its `CityPanel` content is unaffected, since
  the panel is separate) — no special selection-vs-dim priority, to keep it simple and consistent.
- Home `/` `RoutePreview` is a static preview and shows **no** filter.

---

## 4. Placement (ASCII)

All four map-card corners are already occupied (legend bottom-left, 马年 badge top-right,
"点击查看" hint top-left, recenter button bottom-right). The `RouteContent` page header is
rendered **once** above both the desktop grid and the mobile layout — so the chips live there
as a **single instance**, not as a map overlay.

```
Desktop & mobile — single chip row under the page title:
┌─ RouteContent header (rendered ONCE) ───────────────────────┐
│ 行程路线                                       [返回首页]    │
│ 跟随柴火基地车，穿越中国 21 省 26 城。                       │
│ ‹ 〔全部〕  科普 5   创客 3   产业 1 ›   ← chip row (scrolls) │
├─────────────────────────────────────────────────────────────┤
│ desktop: [ map 8/12 ] [ panel 4/12 ]                         │
│ mobile : [ map 45vh ] + bottom drawer                        │
└─────────────────────────────────────────────────────────────┘

Active "科普":  〔科普 5〕 全部  创客 3  产业 1     (科普 filled = brand)
  → 5 科普 stops full; 柳州/毕节/成都 dimmed; 深圳 normal; route faded.
```

The row is horizontally scrollable on narrow screens (`overflow-x-auto no-scrollbar`).

---

## 5. Components & responsibilities

**New — `src/features/route-map/theme.ts`** (pure, easy to test)
- `ThemeType` is **defined in `route-cities.ts`** (next to `RouteCity`); `theme.ts` imports it.
- **`theme.ts` stays pure** — types + arrays + functions only, **no `lucide-react`/React import** —
  so the node-run Playwright unit tests can import it without pulling in React.
- `THEME_ORDER: ThemeType[] = ['science','maker','industry']`.
- `cityMatchesTheme(city: Pick<RouteCity,'themes'>, theme: ThemeType): boolean`
  → `city.themes.includes(theme)`.
- `countThemes(cities: Pick<RouteCity,'themes'>[]): Record<ThemeType, number>`.
- The Lucide **icon map** (`THEME_ICON: Record<ThemeType, LucideIcon>`) lives in `ThemeFilter.tsx`,
  not `theme.ts`. No per-theme colors: active chip uses the brand accent; distinction is
  icon + label (on-palette per CLAUDE.md).

**New — `src/features/route-map/ThemeFilter.tsx`** (presentational)
- Props: `{ counts: Record<ThemeType,number>; active: ThemeType | null;
  onSelect: (t: ThemeType | null) => void; t: Record<string,string> }`.
- Renders a `role="group"` with `aria-label={t['theme.ariaGroup']}` containing:
  - a 全部 chip (`onSelect(null)`, active when `active === null`),
  - one chip per `THEME_ORDER` entry: Lucide icon (aria-hidden) + label + count.
- Each chip is a `<button aria-pressed={isActive}>` with `cursor-pointer transition-colors
  duration-200`. Active: `bg-brand text-brand-foreground`. Inactive: `bg-white
  text-neutral-700 border border-neutral-200 hover:border-neutral-900`.
- Container `data-theme-filter="true"`; each chip `data-theme-chip="<key|all>"`.

**Modify — `src/features/route-map/ChinaRouteMap.tsx`**
- New prop `activeTheme?: ThemeType | null` (default `null`).
- When `activeTheme` is set, compute per-city visual state and emit `data-dimmed="true"` /
  `data-theme-match="true"` on each city's rendered group/hit-circle, and fade the route
  path(s). Origin (`isOrigin`) is never dimmed. No new animations (respect existing
  `useReducedMotion`).
- Does **not** render `ThemeFilter` itself (avoids dual-instance; see placement).

**Modify — `src/app/components/RouteContent.tsx`**
- Add `const [activeTheme, setActiveTheme] = useState<ThemeType|null>(null)`.
- `const themeCounts = useMemo(() => countThemes(localizedCities), [localizedCities])`.
- Render `<ThemeFilter counts={themeCounts} active={activeTheme} onSelect={setActiveTheme} t={t}/>`
  inside the single page-header block (a new row under the title/desc).
- Pass `activeTheme={activeTheme}` to **both** `<ChinaRouteMap>` instances (desktop + mobile).

**Modify — `src/i18n/route.ts`** — add (zh / en):
- `theme.all`: 全部 / All
- `theme.science`: 科普 / STEM
- `theme.maker`: 创客 / Makers
- `theme.industry`: 产业 / Industry
- `theme.ariaGroup`: 按主题筛选地图 / Filter the map by theme

---

## 6. Data flow

```
RouteContent ─ owns activeTheme + themeCounts
   │  counts, active, onSelect            activeTheme
   ▼                                          ▼
ThemeFilter (single)                  ChinaRouteMap ×2 (desktop, mobile)
   click → setActiveTheme(t|null)      → per-city dim/highlight + faded route
```

Counts and active state live in one place; the filter is rendered once; both maps read the
same `activeTheme`. `CityPanel` is untouched.

---

## 7. Testing (`tests/harness/route-map-coordinates.spec.ts`, both chromium-desktop & -mobile)

`RouteContent` renders the map twice (desktop grid + mobile drawer), so map-dot assertions
must use `:visible` scoping — same pattern as the Phase 2 tests. The `ThemeFilter` itself is a
single instance.

1. **Unit — `cityMatchesTheme` / `countThemes`:** `countThemes(routeCities)` →
   `{science:5, maker:3, industry:1}`; 贵阳 matches both `science` and `maker`; 深圳 matches none.
2. **Render:** exactly one `[data-theme-filter="true"]`; it shows the 全部 chip plus chips for
   科普/创客/产业 with their counts (assert visible label text 科普 / 创客 / 产业 and counts 5/3/1).
3. **Apply a lens:** click `[data-theme-chip="science"]` → on the visible map, ≥1 city dot has
   `data-theme-match="true"`; ≥1 non-matching non-origin dot has `data-dimmed="true"`; the
   route path is still rendered; the origin (深圳) dot is **not** `data-dimmed`.
4. **Toggle off:** click `[data-theme-chip="science"]` again → no `[data-dimmed="true"]` remains
   on the visible map.
5. Existing `test.beforeEach` reduced-motion emulation covers stability (no new infinite
   animations are introduced).

---

## 8. Accessibility & conventions

- Chips: `role="group"` + `aria-label`; each chip `<button aria-pressed>`; icons `aria-hidden`.
- `cursor-pointer` + `transition-colors duration-200` on every chip (project convention).
- Lucide icons only; brand/neutral tokens only (no hardcoded hex, no per-theme rainbow).

---

## 9. Scope / YAGNI

**In:** single-select theme chips; multi-valued `themes[]`; dim-not-hide map emphasis;
counts; zh/en; tests on both projects.

**Out (explicitly):** GMaps-style zoom +/− action buttons (d3-zoom wheel/pinch + recenter
already cover it); multi-select / AND·OR logic; hiding stops; `events[]` restructure;
per-theme colors; any change to zoom, `CityPanel` selection, the HERO slogan, or Phase 1/2
shipped behavior; filter on the home `RoutePreview`.
