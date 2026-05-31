# Route Map Theme Filter Chips (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-05-28-route-map-theme-filter-design.md`
> **Project rule:** NEVER commit anything under `docs/superpowers/`. Do NOT modify the HERO slogan. `pnpm` only.

**Goal:** Add single-select theme chips (科普 / 创客 / 产业) above the `/route` map that highlight matching stops and dim the rest, keeping the continuous horse route visible.

**Architecture:** A new pure module `theme.ts` (types/helpers) + a presentational `ThemeFilter.tsx` chip row. `RouteContent` owns `activeTheme` state, renders one `ThemeFilter`, and passes `activeTheme` to both `ChinaRouteMap` instances (desktop + mobile). `ChinaRouteMap` reads `city.themes` and emits `data-dimmed` / `data-theme-match` on city dot groups + fades the route-segment layer. Cities gain a multi-valued `themes: ThemeType[]`. Filtering is a map-only visual layer (no zoom/panel change).

**Tech Stack:** Astro 6 + React 19 islands, TypeScript, Tailwind v4, Framer Motion (`motion/react`), Lucide icons, Playwright harness (`pnpm run harness`, chromium-desktop + chromium-mobile).

---

## File Structure

- **Create** `src/features/route-map/theme.ts` — pure: `THEME_ORDER`, `cityMatchesTheme`, `countThemes`. No React/lucide import.
- **Create** `src/features/route-map/ThemeFilter.tsx` — presentational chip row (owns the Lucide icon map).
- **Modify** `src/data/route-cities.ts` — add `ThemeType` + `themes: ThemeType[]`; populate all 9 cities.
- **Modify** `src/features/route-map/ChinaRouteMap.tsx` — add `activeTheme` prop; per-city dim/highlight + segment-layer fade.
- **Modify** `src/app/components/RouteContent.tsx` — `activeTheme` state, render `ThemeFilter`, pass prop to both maps.
- **Modify** `src/features/route-map/index.ts` — export `ThemeFilter` + `theme.ts`.
- **Modify** `src/i18n/route.ts` — theme i18n keys (zh/en).
- **Modify** `tests/harness/route-map-coordinates.spec.ts` — update `makeProjectedCity`; add unit + browser tests.

Run a single Playwright spec with: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts`
(Playwright builds + previews via its webServer; first run builds `dist/`.)

---

### Task 0: Create the feature branch

**Files:** none (git).

- [ ] **Step 1: Branch off main**

```bash
git checkout main
git pull origin main
git checkout -b feature/route-map-theme-filter
git branch --show-current   # expect: feature/route-map-theme-filter
```

---

### Task 1: Data model — `ThemeType` + `themes[]` on every city

**Files:**
- Modify: `src/data/route-cities.ts`
- Modify: `tests/harness/route-map-coordinates.spec.ts` (the `makeProjectedCity` helper)
- Test: `tests/harness/route-map-coordinates.spec.ts`

- [ ] **Step 1: Write the failing test**

Add near the other unit tests (after the `label placement is indexed by stable city id` test, ~line 138) in `tests/harness/route-map-coordinates.spec.ts`:

```typescript
test('route city theme tags cover the expected stops', () => {
  const idsWith = (theme: string) =>
    routeCities.filter((c) => c.themes.includes(theme as never)).map((c) => c.id).sort();

  expect(idsWith('science')).toEqual(
    ['guangzhou', 'guiyang', 'nanning', 'yangjiang', 'yulin'].sort(),
  );
  expect(idsWith('maker')).toEqual(['bijie', 'chengdu', 'guiyang'].sort());
  expect(idsWith('industry')).toEqual(['liuzhou']);
  // Origin carries no activity theme.
  expect(routeCities.find((c) => c.id === 'shenzhen')!.themes).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme tags" --project=chromium-desktop`
Expected: FAIL — `Property 'themes' does not exist on type 'RouteCity'` (TS) or runtime `c.themes is undefined`.

- [ ] **Step 3: Add the type + field to `RouteCity`**

In `src/data/route-cities.ts`, above `export interface RouteCity {` add:

```typescript
export type ThemeType = 'science' | 'maker' | 'industry';
```

Inside `interface RouteCity`, add after the `relationType?: ...` line:

```typescript
  /** Activity themes this stop belongs to (multi-valued). Origin = []. */
  themes: ThemeType[];
```

- [ ] **Step 4: Populate `themes` on all 9 cities**

Add a `themes: [...]` entry to each object in `routeCities` (place it right after each `order:`/`relationType` line for readability):

```typescript
// shenzhen  (origin — no activity theme)
themes: [],
// guangzhou
themes: ['science'],
// yangjiang
themes: ['science'],
// yulin
themes: ['science'],
// nanning
themes: ['science'],
// liuzhou
themes: ['industry'],
// guiyang  (schools/university = science; met local makers = maker)
themes: ['science', 'maker'],
// bijie
themes: ['maker'],
// chengdu
themes: ['maker'],
```

- [ ] **Step 5: Update the `makeProjectedCity` test helper**

In `tests/harness/route-map-coordinates.spec.ts`, the `makeProjectedCity` factory builds a full `ProjectedCity`. Add a `themes` line to the returned object (next to `relationType`):

```typescript
    relationType: overrides.relationType,
    themes: overrides.themes ?? [],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme tags" --project=chromium-desktop`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/route-cities.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "feat(route-map): add multi-valued themes[] to route cities"
```

---

### Task 2: Pure theme helpers — `theme.ts`

**Files:**
- Create: `src/features/route-map/theme.ts`
- Test: `tests/harness/route-map-coordinates.spec.ts`

- [ ] **Step 1: Write the failing test**

Add an import at the top of `tests/harness/route-map-coordinates.spec.ts` (next to the existing `placeLabels` import):

```typescript
import { cityMatchesTheme, countThemes, THEME_ORDER } from '../../src/features/route-map/theme';
```

Add these tests after the Task 1 test:

```typescript
test('THEME_ORDER lists the three themes in display order', () => {
  expect(THEME_ORDER).toEqual(['science', 'maker', 'industry']);
});

test('cityMatchesTheme checks membership; guiyang matches science and maker', () => {
  const guiyang = routeCities.find((c) => c.id === 'guiyang')!;
  expect(cityMatchesTheme(guiyang, 'science')).toBe(true);
  expect(cityMatchesTheme(guiyang, 'maker')).toBe(true);
  expect(cityMatchesTheme(guiyang, 'industry')).toBe(false);
});

test('countThemes tallies all cities (science 5, maker 3, industry 1)', () => {
  expect(countThemes(routeCities)).toEqual({ science: 5, maker: 3, industry: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "THEME_ORDER|cityMatchesTheme|countThemes" --project=chromium-desktop`
Expected: FAIL — cannot resolve module `../../src/features/route-map/theme`.

- [ ] **Step 3: Create `theme.ts`**

```typescript
// src/features/route-map/theme.ts
import type { RouteCity, ThemeType } from '@/data/route-cities';

/** Display order of theme chips. */
export const THEME_ORDER: ThemeType[] = ['science', 'maker', 'industry'];

/** True when a city carries the given activity theme. */
export function cityMatchesTheme(city: Pick<RouteCity, 'themes'>, theme: ThemeType): boolean {
  return city.themes.includes(theme);
}

/** Count how many cities carry each theme. */
export function countThemes(cities: Pick<RouteCity, 'themes'>[]): Record<ThemeType, number> {
  const counts: Record<ThemeType, number> = { science: 0, maker: 0, industry: 0 };
  for (const city of cities) {
    for (const theme of THEME_ORDER) {
      if (cityMatchesTheme(city, theme)) counts[theme] += 1;
    }
  }
  return counts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "THEME_ORDER|cityMatchesTheme|countThemes" --project=chromium-desktop`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/route-map/theme.ts tests/harness/route-map-coordinates.spec.ts
git commit -m "feat(route-map): add pure theme helpers (THEME_ORDER, cityMatchesTheme, countThemes)"
```

---

### Task 3: i18n keys + `ThemeFilter.tsx` component + exports

**Files:**
- Modify: `src/i18n/route.ts`
- Create: `src/features/route-map/ThemeFilter.tsx`
- Modify: `src/features/route-map/index.ts`

No isolated test (it's a presentational island; verified by the browser tests in Task 5).

- [ ] **Step 1: Add i18n keys**

In `src/i18n/route.ts`, add to the **zh** block (before the closing `'map.recenter'` line):

```typescript
    'theme.all': '全部',
    'theme.science': '科普',
    'theme.maker': '创客',
    'theme.industry': '产业',
    'theme.ariaGroup': '按主题筛选地图',
```

Add to the **en** block (before its `'map.recenter'` line):

```typescript
    'theme.all': 'All',
    'theme.science': 'STEM',
    'theme.maker': 'Makers',
    'theme.industry': 'Industry',
    'theme.ariaGroup': 'Filter the map by theme',
```

- [ ] **Step 2: Create `ThemeFilter.tsx`**

```tsx
// src/features/route-map/ThemeFilter.tsx
import { GraduationCap, Wrench, Factory, type LucideIcon } from 'lucide-react';
import type { ThemeType } from '@/data/route-cities';
import { THEME_ORDER } from './theme';

const THEME_ICON: Record<ThemeType, LucideIcon> = {
  science: GraduationCap,
  maker: Wrench,
  industry: Factory,
};

interface Props {
  counts: Record<ThemeType, number>;
  active: ThemeType | null;
  onSelect: (theme: ThemeType | null) => void;
  t: Record<string, string>;
}

const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors duration-200';
const ACTIVE_CLS = 'bg-brand text-brand-foreground border-brand';
const IDLE_CLS = 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900';

export default function ThemeFilter({ counts, active, onSelect, t }: Props) {
  return (
    <div
      role="group"
      aria-label={t['theme.ariaGroup'] ?? '按主题筛选地图'}
      data-theme-filter="true"
      className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
    >
      <button
        type="button"
        data-theme-chip="all"
        aria-pressed={active === null}
        onClick={() => onSelect(null)}
        className={`${CHIP_BASE} ${active === null ? ACTIVE_CLS : IDLE_CLS}`}
      >
        {t['theme.all'] ?? '全部'}
      </button>
      {THEME_ORDER.map((key) => {
        const Icon = THEME_ICON[key];
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            data-theme-chip={key}
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? null : key)}
            className={`${CHIP_BASE} ${isActive ? ACTIVE_CLS : IDLE_CLS}`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t[`theme.${key}`] ?? key}</span>
            <span className={isActive ? 'text-brand-foreground/80' : 'text-neutral-400'}>
              {counts[key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Export from the feature index**

In `src/features/route-map/index.ts`, add:

```typescript
export { default as ThemeFilter } from "./ThemeFilter";
export * from "./theme";
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec astro check`
Expected: no new errors referencing `ThemeFilter`, `theme`, or `themes`.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/route.ts src/features/route-map/ThemeFilter.tsx src/features/route-map/index.ts
git commit -m "feat(route-map): add ThemeFilter chip component + i18n keys"
```

---

### Task 4: `ChinaRouteMap` — `activeTheme` prop, per-city dim/highlight, segment fade

**Files:**
- Modify: `src/features/route-map/ChinaRouteMap.tsx`

No isolated test (exercised by Task 5 browser tests).

- [ ] **Step 1: Add the `activeTheme` prop**

First extend the existing data-type import at the top of the file (currently `import type { RouteCity } from "@/data/route-cities";`):

```tsx
import type { RouteCity, ThemeType } from "@/data/route-cities";
```

Then, in `ChinaRouteMap`'s props (the destructured object, currently `{ cities, selectedKey, onSelect, t }`), add `activeTheme`:

```tsx
export default function ChinaRouteMap({
  cities,
  selectedKey,
  onSelect,
  t,
  activeTheme = null,
}: {
  cities: RouteCity[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  t: Record<string, string>;
  activeTheme?: ThemeType | null;
}) {
```

- [ ] **Step 2: Add a per-city visual helper**

Just after the `cityDelay` definition (the `const cityDelay = ...` arrow, ~line 76), add:

```tsx
  // Theme lens: matched cities pop, non-matched non-origin cities dim. Origin exempt.
  const cityThemeState = (city: ProjectedCity) => {
    if (!activeTheme || city.isOrigin) return { dimmed: false, matched: false };
    const matched = city.themes.includes(activeTheme);
    return { dimmed: !matched, matched };
  };
```

- [ ] **Step 3: Wrap the route-segment layer so it fades under a lens**

The segment list is rendered as `{segments.map((seg, i) => { ... })}` (the block that starts `{/* 层二：城市间连线 ... */}`). Wrap that entire `{segments.map(...)}` expression in a `<g>`:

```tsx
            {/* 层二：城市间连线 — 已访问优先动（镜头激活时整体淡出，保住马形） */}
            <g
              data-route-segments="true"
              style={{ opacity: activeTheme ? 0.2 : 1, transition: 'opacity 0.3s ease' }}
            >
              {segments.map((seg, i) => {
                /* ...existing body unchanged... */
              })}
            </g>
```

(Only add the opening `<g ...>` before `{segments.map` and the closing `</g>` after the map's closing `)}`. Do not touch the segment body.)

- [ ] **Step 4: Tag + dim each city dot group**

In the city-node loop `{projected.map((city) => { ... })}`, the body currently computes `const isSelected = ...` then returns `<g key={city.label}>`. Add the theme state and apply it to the group:

```tsx
            {projected.map((city) => {
              const { cx, cy, elevationOffset, isLatest } = city;
              const delay = cityDelay(city.order, city.visited);
              const isSelected = selectedKey === city.label;
              const { dimmed, matched } = cityThemeState(city);
              const r = isLatest ? 6.0 : city.isOrigin ? 5.5 : city.visited ? 4.5 : 3.5;
              const projectionY = cy - elevationOffset;
              const markerX = cx;
              const markerY = projectionY;

              return (
                <g
                  key={city.label}
                  data-route-city="true"
                  data-city-id={city.id}
                  data-dimmed={dimmed ? 'true' : undefined}
                  data-theme-match={matched ? 'true' : undefined}
                  style={{ opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.3s ease' }}
                >
```

(Keep the rest of the `<g>` body unchanged. Note: `data-city-id` already appears on inner `<line>`/`<text>` elements elsewhere; the new `data-route-city="true"` on the group makes city dot groups uniquely selectable.)

- [ ] **Step 5: Dim the matching label**

In the **label overlay loop** (`{projected.map((city) => { ... })}` that returns `<motion.text data-route-city-label="true" ...>`), compute the same dim and wrap the `<motion.text>` in a `<g>` carrying the opacity. Change the `return (` so it reads:

```tsx
          {projected.map((city) => {
            const offset = labelOffsets.get(city.id);
            if (!city.showLabel || !offset) return null;
            const sx = transform.x + transform.k * city.cx;
            const sy = transform.y + transform.k * (city.cy - city.elevationOffset);
            const isLatest = city.isLatest;
            const labelDimmed = cityThemeState(city).dimmed; // reuse the same lens logic
            return (
              <g key={`label-${city.id}`} style={{ opacity: labelDimmed ? 0.25 : 1, transition: 'opacity 0.3s ease' }}>
                <motion.text
                  data-route-city-label="true"
                  data-city-id={city.id}
                  /* ...existing attributes/children unchanged... */
                >
                  {/* existing children */}
                </motion.text>
              </g>
            );
          })}
```

(Move the `key` to the wrapping `<g>`; remove the `key={`label-${city.id}`}` from `<motion.text>` to avoid a duplicate-key lint — the text keeps all its other props.)

- [ ] **Step 6: Type-check**

Run: `pnpm exec astro check`
Expected: no new type errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/route-map/ChinaRouteMap.tsx
git commit -m "feat(route-map): dim/highlight cities + fade route segments by active theme"
```

---

### Task 5: Wire `RouteContent` + browser tests

**Files:**
- Modify: `src/app/components/RouteContent.tsx`
- Test: `tests/harness/route-map-coordinates.spec.ts`

- [ ] **Step 1: Write the failing browser tests**

Append to `tests/harness/route-map-coordinates.spec.ts` (after the Phase 2 fallback test). `gotoRoute` and the `Page` type are already imported and `reducedMotion` is emulated by the existing `beforeEach`.

> **Why we don't use `:visible` here:** Playwright's `:visible` is reliable for HTML (the Phase 2 panel tests use it for `[data-expedition-log]` etc.), but it's flaky for inline SVG `<g>` groups. The existing tests in this file already filter SVG visibility via `getClientRects().length > 0` (see `getVisibleLabelIds` at line 84). We follow that pattern.
>
> **Why `expect.poll` for opacity:** the segment fade has a 0.3s CSS transition. `getComputedStyle().opacity` reports mid-transition values, so we poll until it settles.

```typescript
// ── Phase 3: Theme filter chips ───────────────────────────────────────────────
// ThemeFilter is a SINGLE instance in the page header. The map renders twice
// (desktop grid + mobile drawer); SVG <g> visibility is determined via
// getClientRects() — same pattern as getVisibleLabelIds above.

async function countVisibleCityGroups(page: Page, attrFilter: string): Promise<number> {
  return page.locator(`[data-route-city="true"]${attrFilter}`).evaluateAll((nodes) =>
    nodes.filter((n) => (n as Element).getClientRects().length > 0).length,
  );
}

async function visibleSegmentLayerOpacity(page: Page): Promise<string | null> {
  return page.locator('[data-route-segments="true"]').evaluateAll((nodes) => {
    const v = nodes.find((n) => (n as Element).getClientRects().length > 0);
    return v ? window.getComputedStyle(v as Element).opacity : null;
  });
}

test('route page renders theme chips with counts', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  await expect(page.locator('[data-theme-filter="true"]')).toHaveCount(1);
  await expect(page.locator('[data-theme-chip="all"]')).toHaveText('全部');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('科普');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('5');
  await expect(page.locator('[data-theme-chip="maker"]')).toContainText('3');
  await expect(page.locator('[data-theme-chip="industry"]')).toContainText('1');
});

test('en route page renders theme chips with English labels', async ({ page }) => {
  await gotoRoute(page, { path: '/en/route', name: 'route-en', locale: 'en' });

  await expect(page.locator('[data-theme-filter="true"]')).toHaveCount(1);
  await expect(page.locator('[data-theme-chip="all"]')).toHaveText('All');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('STEM');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('5');
  await expect(page.locator('[data-theme-chip="maker"]')).toContainText('Makers');
  await expect(page.locator('[data-theme-chip="industry"]')).toContainText('Industry');
});

test('selecting a theme highlights matches and dims the rest; origin stays lit; segments fade', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  await page.locator('[data-theme-chip="science"]').click();

  // 5 science stops matched on the visible map, 3 non-origin non-matching dimmed.
  expect(await countVisibleCityGroups(page, '[data-theme-match="true"]')).toBe(5);
  expect(await countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(3);
  // Origin (深圳) is exempt — never dimmed (across both rendered maps).
  await expect(
    page.locator('[data-route-city="true"][data-city-id="shenzhen"][data-dimmed="true"]'),
  ).toHaveCount(0);
  // Segment layer actually fades — wait for the 0.3s CSS transition to settle.
  await expect.poll(() => visibleSegmentLayerOpacity(page)).toBe('0.2');
});

test('clicking the active theme again clears the lens and restores segment opacity', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const chip = page.locator('[data-theme-chip="science"]');
  await chip.click();
  expect(await countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(3);
  await expect.poll(() => visibleSegmentLayerOpacity(page)).toBe('0.2');

  await chip.click(); // toggle off
  expect(await countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(0);
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => visibleSegmentLayerOpacity(page)).toBe('1');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme chips|highlights matches|clears the lens" --project=chromium-desktop`
Expected: FAIL — no `[data-theme-filter]` exists yet (chips not wired into the page).

- [ ] **Step 3: Wire `RouteContent`**

In `src/app/components/RouteContent.tsx`:

(a) Update the feature import and add the data-type import:

```tsx
import { ChinaRouteMap, CityPanel, ThemeFilter, localizeCity, countThemes } from "@/features/route-map";
import { routeCities, type ThemeType } from "@/data/route-cities";
```

(b) Add state + counts inside the component, after the existing `const [selectedCityKey, setSelectedCityKey] = useState(...)` block:

```tsx
  const [activeTheme, setActiveTheme] = useState<ThemeType | null>(null);
  const themeCounts = useMemo(() => countThemes(localizedCities), [localizedCities]);
```

(c) Render the chip row inside the single page-header block. Replace the header `<div>` (the `flex items-center justify-between ...` block with `<h1>` and the back-home `<a>`) so the chips sit on their own row below the title row — change the outer header container to stack, and add `ThemeFilter` after the title/link row:

```tsx
        {/* Premium Header */}
        <div className="w-full border-b border-neutral-350/20 pb-5 mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {getT('route.pageTitle', '行程路线')}
              </h1>
              <p className="text-sm text-neutral-500 mt-1 font-medium">
                {getT('route.pageDesc', '跟随柴火基地车，穿越中国 21 省 26 城。')}
              </p>
            </div>
            <a
              href={locale === 'zh' ? '/' : '/en'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{getT('route.action.backHome', '返回首页')}</span>
            </a>
          </div>
          <div className="mt-4">
            <ThemeFilter counts={themeCounts} active={activeTheme} onSelect={setActiveTheme} t={t} />
          </div>
        </div>
```

(d) Pass `activeTheme` to **both** `<ChinaRouteMap>` instances (desktop block and mobile block) — add the prop alongside the existing ones:

```tsx
            <ChinaRouteMap
              cities={localizedCities}
              selectedKey={selectedCityKey}
              onSelect={handleCitySelect}
              activeTheme={activeTheme}
              t={t}
            />
```

(Do this in both the `lg:grid` desktop block and the `lg:hidden` mobile block.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme chips|highlights matches|clears the lens" --project=chromium-desktop`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the same on mobile (dual-render check)**

Run: `pnpm exec playwright test tests/harness/route-map-coordinates.spec.ts -g "theme chips|highlights matches|clears the lens" --project=chromium-mobile`
Expected: PASS (4 tests). If a count is off, confirm `:visible` is scoping to the single visible map (the hidden layout is `display:none`).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/RouteContent.tsx tests/harness/route-map-coordinates.spec.ts
git commit -m "feat(route-map): wire ThemeFilter into RouteContent; theme-filter browser tests"
```

---

### Task 6: Full verification + finish

**Files:** none (verification).

- [ ] **Step 1: Run the full harness on both projects**

Run: `pnpm run harness`
Expected: all tests pass on chromium-desktop AND chromium-mobile (includes content check + `astro check` + every spec). The previously-shipped route-map tests must stay green.

- [ ] **Step 2: Manual smoke (optional but recommended)**

Run: `pnpm dev`, open `/route` and `/en/route`. Verify: chips show 全部/科普5/创客3/产业1 (All/STEM5/Makers3/Industry1); clicking 科普 lights the 5 science stops and fades the rest while the route stays visible; 深圳 stays lit; clicking 科普 again clears; chips scroll horizontally on a narrow window.

- [ ] **Step 3: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill (verify tests → push → PR, or merge per user choice). Do not auto-merge without the user's decision.

---

## Notes for the implementer

- **YAGNI / out of scope:** GMaps zoom +/− buttons; multi-select; hiding stops; `events[]` restructure; per-theme colors; any change to zoom, `CityPanel` selection, the HERO slogan, or Phase 1/2 behavior; filtering on the home `RoutePreview`.
- **Conventions:** Lucide icons only; brand/neutral tokens only (no hardcoded hex); every interactive element has `cursor-pointer` + `transition-colors duration-200`; `pnpm` only.
- **Reduced motion:** introduce no new `repeat: Infinity` animations. The opacity transitions added here are one-shot CSS transitions and are safe.
- **Dual-render reminder:** `RouteContent` renders `ChinaRouteMap` twice; the chip row is rendered once. For inline SVG, **use `getClientRects()` filtering** (see `getVisibleLabelIds` already in the spec file at line 84) — Playwright's `:visible` is reliable for HTML (the Phase 2 panel tests) but flaky for SVG `<g>`. The helpers `countVisibleCityGroups` / `visibleSegmentLayerOpacity` in Task 5 follow that pattern.
- **Codex review (2026-05-28):** addressed all three Should-Fix items — SVG visibility via `getClientRects()` not `:visible`; segment-fade asserted via `getComputedStyle().opacity` with `expect.poll` (not just `toBeAttached`); added an `/en/route` test for English chip labels.
