import { expect, type Page, test } from '@playwright/test';
import { geoMercator } from 'd3-geo';
import {
  MAP_HEIGHT,
  MAP_SCALE_DENOMINATOR,
  MAP_TRANSLATE_Y_OFFSET,
  MAP_WIDTH,
} from '../../src/features/route-map/constants';
import { placeLabels } from '../../src/features/route-map/label-layout';
import type { Stop as RouteCity } from '../../src/features/route-map/stops-loader';
import { cityMatchesTheme, countThemes, THEME_ORDER } from '../../src/features/route-map/theme';
import type { ProjectedCity } from '../../src/features/route-map/types';
import { gotoRoute, installHarnessGuards } from './helpers';
import { loadStops } from './lib/load-stops';

const projection = geoMercator()
  .center([105, 36])
  .scale(MAP_WIDTH / MAP_SCALE_DENOMINATOR)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + MAP_TRANSLATE_Y_OFFSET]);

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

function makeProjectedCity(
  overrides: Partial<ProjectedCity> & Pick<ProjectedCity, 'id' | 'label' | 'cx' | 'cy'>,
): ProjectedCity {
  return {
    id: overrides.id,
    label: overrides.label,
    lng: overrides.lng ?? 0,
    lat: overrides.lat ?? 0,
    visited: overrides.visited ?? true,
    isOrigin: overrides.isOrigin,
    anchor: overrides.anchor,
    order: overrides.order ?? 0,
    relationType: overrides.relationType ?? 'education',
    relationStats: overrides.relationStats ?? [],
    event: overrides.event,
    altitude: overrides.altitude ?? '0',
    terrain: overrides.terrain ?? '',
    terrainStep: overrides.terrainStep ?? '',
    climate: overrides.climate ?? '',
    challenge: overrides.challenge ?? '',
    themes: overrides.themes ?? [],
    cx: overrides.cx,
    cy: overrides.cy,
    elevationOffset: overrides.elevationOffset ?? 0,
    isLatest: overrides.isLatest ?? false,
    showLabel: overrides.showLabel ?? true,
    fontSize: overrides.fontSize ?? 10,
  };
}

async function getVisibleProvinceFootprint(page: Page, svgSelector: string) {
  return page
    .locator(`${svgSelector} path[fill="#ffffff"], ${svgSelector} path[fill="#fdf6d2"]`)
    .evaluateAll((nodes) => {
      const boxes = nodes
        .filter((node) => node.getClientRects().length > 0)
        .map((node) => {
          const box = (node as SVGGraphicsElement).getBBox();
          return {
            x1: box.x,
            y1: box.y,
            x2: box.x + box.width,
            y2: box.y + box.height,
          };
        });

      return boxes.reduce(
        (acc, box) => ({
          x1: Math.min(acc.x1, box.x1),
          y1: Math.min(acc.y1, box.y1),
          x2: Math.max(acc.x2, box.x2),
          y2: Math.max(acc.y2, box.y2),
        }),
        { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity },
      );
    });
}

async function getVisibleLabelIds(page: Page, selector = '[data-route-city-label="true"]') {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => node.getAttribute('data-city-id'))
      .filter((id): id is string => !!id)
      .sort(),
  );
}

async function getVisibleLabelBoxes(page: Page, selector = '[data-route-city-label="true"]') {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => {
        const box = (node as SVGGraphicsElement).getBBox();
        return {
          id: node.getAttribute('data-city-id'),
          x1: box.x,
          y1: box.y,
          x2: box.x + box.width,
          y2: box.y + box.height,
        };
      }),
  );
}

function boxesOverlap(
  a: Awaited<ReturnType<typeof getVisibleLabelBoxes>>[number],
  b: Awaited<ReturnType<typeof getVisibleLabelBoxes>>[number],
) {
  return !(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1);
}

function expectedPoint(city: (typeof sortedCities)[number]) {
  const point = projection([city.lng, city.lat]);
  if (!point) throw new Error(`Could not project ${city.id}`);
  return { id: city.id, x: point[0], y: point[1] };
}

// Run page tests with reduced motion: the route map honors prefers-reduced-motion
// and skips its perpetual animations, so context teardown doesn't stall on the
// never-ending rAF loops under parallel-worker load.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('label placement is indexed by stable city id', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'same-name-a', label: '同名', cx: 100, cy: 100 }),
    makeProjectedCity({ id: 'same-name-b', label: '同名', cx: 130, cy: 100 }),
  ]);

  expect(Array.from(placements.keys()).sort()).toEqual(['same-name-a', 'same-name-b']);
  expect(placements.has('同名')).toBe(false);
});

test('route city theme tags are valid: origin bare, themes within THEME_ORDER, each theme used', () => {
  // Origin (深圳) carries no activity theme.
  expect(routeCities.find((c) => c.id === 'shenzhen')!.themes).toEqual([]);
  // Known anchor that must remain stable regardless of route growth.
  expect(
    routeCities
      .find((c) => c.id === 'guiyang')!
      .themes.slice()
      .sort(),
  ).toEqual(['maker', 'science']);
  // Every city's themes are valid values.
  for (const c of routeCities) {
    for (const th of c.themes) {
      expect(THEME_ORDER).toContain(th);
    }
  }
  // Every theme in the legend is actually used by at least one city.
  for (const th of THEME_ORDER) {
    expect(routeCities.some((c) => c.themes.includes(th as never))).toBe(true);
  }
});

test('THEME_ORDER lists the three themes in display order', () => {
  expect(THEME_ORDER).toEqual(['science', 'maker', 'industry']);
});

test('cityMatchesTheme checks membership; guiyang matches science and maker', () => {
  const guiyang = routeCities.find((c) => c.id === 'guiyang')!;
  expect(cityMatchesTheme(guiyang, 'science')).toBe(true);
  expect(cityMatchesTheme(guiyang, 'maker')).toBe(true);
  expect(cityMatchesTheme(guiyang, 'industry')).toBe(false);
});

test('countThemes matches an independent per-theme tally of all cities', () => {
  const expected = Object.fromEntries(
    THEME_ORDER.map((th) => [th, routeCities.filter((c) => c.themes.includes(th as never)).length]),
  );
  expect(countThemes(routeCities)).toEqual(expected);
  // Sanity: at least the three legend themes are present and positive.
  for (const th of THEME_ORDER) {
    expect(countThemes(routeCities)[th]).toBeGreaterThan(0);
  }
});

test('placeLabels hides a low-priority label that cannot sit near its dot', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'a', label: '甲', cx: 100, cy: 100, order: 0, visited: true }),
    makeProjectedCity({ id: 'b', label: '乙', cx: 108, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'c', label: '丙', cx: 116, cy: 100, order: 2, visited: true }),
  ]);
  const culled = ['a', 'b', 'c'].filter((id) => placements.get(id) === null);
  expect(culled.length).toBeGreaterThan(0);
});

test('placeLabels always keeps the origin label even when crowded', () => {
  const placements = placeLabels([
    makeProjectedCity({
      id: 'origin',
      label: '深圳',
      cx: 100,
      cy: 100,
      order: 0,
      isOrigin: true,
      visited: true,
    }),
    makeProjectedCity({ id: 'x', label: '甲', cx: 106, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'y', label: '乙', cx: 112, cy: 100, order: 2, visited: true }),
  ]);
  expect(placements.get('origin')).not.toBeNull();
});

test('placeLabels keeps a placed label within MAX_LABEL_DISTANCE of its dot', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'solo', label: '成都', cx: 300, cy: 300, order: 0, visited: true }),
  ]);
  const offset = placements.get('solo');
  expect(offset).not.toBeNull();
  const [dx, dy] = offset as [number, number];
  // A near placement keeps the raw offset small (centered above/below the dot).
  expect(Math.hypot(dx, dy)).toBeLessThan(23);
});

test('placeLabels shows all labels once dots are spread far apart', () => {
  const placements = placeLabels([
    makeProjectedCity({ id: 'a', label: '甲', cx: 100, cy: 100, order: 0, visited: true }),
    makeProjectedCity({ id: 'b', label: '乙', cx: 300, cy: 100, order: 1, visited: true }),
    makeProjectedCity({ id: 'c', label: '丙', cx: 500, cy: 100, order: 2, visited: true }),
  ]);
  expect(placements.get('a')).not.toBeNull();
  expect(placements.get('b')).not.toBeNull();
  expect(placements.get('c')).not.toBeNull();
});

test('home preview city dots sit on geographic coordinates', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const points = await page
    .locator('svg[role="img"] circle[stroke="#fffaf0"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: Number(node.getAttribute('cx')),
        y: Number(node.getAttribute('cy')),
      })),
    );

  expect(points).toHaveLength(sortedCities.length);
  for (const [index, actual] of points.entries()) {
    const expected = expectedPoint(sortedCities[index]);
    expect(actual.x, `${expected.id} x`).toBeCloseTo(expected.x, 0);
    expect(actual.y, `${expected.id} y`).toBeCloseTo(expected.y, 0);
  }
});

test('home preview China outline uses the enlarged map footprint', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const box = await getVisibleProvinceFootprint(page, 'svg[role="img"]');
  expect(box.x2 - box.x1).toBeGreaterThan(700);
  expect(box.y2 - box.y1).toBeGreaterThan(500);
  expect(box.x1).toBeGreaterThan(35);
  expect(box.x2).toBeLessThan(MAP_WIDTH - 40);
  expect(box.y1).toBeGreaterThan(35);
});

test('home preview shows key labels from route city data', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const visible = await getVisibleLabelIds(page, 'svg[role="img"] [data-route-city-label="true"]');
  expect(visible).toContain('shenzhen');
  expect(visible.length).toBeGreaterThan(0);
  for (const id of visible) {
    expect(expectedLabelIds).toContain(id);
  }
});

test('home preview labels do not overlap each other', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const boxes = await getVisibleLabelBoxes(page, 'svg[role="img"] [data-route-city-label="true"]');
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesOverlap(boxes[i], boxes[j]), `${boxes[i].id} overlaps ${boxes[j].id}`).toBe(
        false,
      );
    }
  }
});

// ── Phase 2: Expedition log / people / photo panel tests ──────────────────────
// RouteContent renders the map + CityPanel TWICE: once in the desktop split layout
// (visible on lg+ via `hidden lg:grid`) and once in the mobile bottom drawer
// (hidden on lg+ via `lg:hidden`). Both MapLibreCanvas instances mount and create
// their own HTML markers, so `[data-route-city]`/`maplibregl-canvas` resolve to two
// elements; the hidden-layout copies report no client rects. We therefore scope
// selection to the *visible* marker and use :visible / .first() for panel locators.
//
// Selection is driven by clicking a MapLibre HTML marker button
// ([data-route-city="true"][data-city-id="<id>"]). force:true is required because
// the MapLibre GL container can intercept pointer events on the marker buttons.

const MAPLIBRE_CANVAS = '[data-maplibre-canvas="true"] canvas.maplibregl-canvas';

async function selectCityMarker(page: Page, cityId: string) {
  // Both layouts mount a map and create their own markers. The hidden-layout copies
  // live under a display:none ancestor, so their markers report no client rects and
  // are excluded by Playwright's :visible. Markers are created on the MapLibre 'load'
  // event (after the canvas gains size), so wait for the visible marker to appear.
  const marker = page.locator(`.mlc-marker[data-city-id="${cityId}"]:visible`);
  await expect(marker).toHaveCount(1, { timeout: 15_000 });
  // The map eases to the default-selected city on load, which can translate a target
  // marker outside the GL viewport — a hit-tested pointer click would then miss. The
  // marker is a real <button> with a click listener, so dispatch the event directly
  // (mirrors how the old SVG tests selected cities) to reliably trigger onSelect.
  await marker.dispatchEvent('click');
}

test('route page renders expedition log + people + photo for a stop with data', async ({
  page,
}) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 柳州 — has expedition, 1 person, 1 photo.
  await selectCityMarker(page, 'liuzhou');

  const expeditionLog = page.locator('[data-expedition-log="true"]:visible').first();
  await expect(expeditionLog).toBeVisible();
  // Assert a punctuation-free substring to avoid half/full-width punctuation fragility.
  await expect(expeditionLog).toContainText('养鱼塘');
  await expect(page.locator('[data-people-card="true"]:visible').first()).toBeVisible();
  await expect(page.locator('[data-photo-thumb="true"]:visible').first()).toBeVisible();
});

test('route page photo thumbnail opens a lightbox dialog', async ({ page }) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 柳州.
  await selectCityMarker(page, 'liuzhou');

  await page.locator('[data-photo-thumb="true"]:visible').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('img')).toBeVisible();
});

test('route page falls back gracefully for a stop without expedition data', async ({ page }) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 深圳 (origin) — no expedition data; shows event.summary instead.
  await selectCityMarker(page, 'shenzhen');

  await expect(page.locator('[data-expedition-log="true"]:visible')).toHaveCount(0);
  // Scope to the CityPanel <article> heading. On mobile the drawer peek bar also
  // renders an <h4> with the city name (outside the article), so an unscoped
  // getByRole('heading') would match two elements and trip strict mode.
  await expect(
    page.getByRole('article').getByRole('heading', { name: '深圳' }).first(),
  ).toBeVisible();
});

// ── Phase 3: Theme filter chips ───────────────────────────────────────────────
// ThemeFilter is a SINGLE instance in the page header. The map renders twice
// (desktop grid + mobile drawer); MapLibre markers are HTML <button> elements
// carrying data-theme-match / data-dimmed when a theme lens is active. The route
// itself is a GL layer with no DOM, so segment opacity is not asserted.

test('route page renders theme chips with counts', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  await expect(page.locator('[data-theme-filter="true"]')).toHaveCount(1);
  const counts = countThemes(routeCities);
  await expect(page.locator('[data-theme-chip="all"]')).toHaveText('全部');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('科普');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText(String(counts.science));
  await expect(page.locator('[data-theme-chip="maker"]')).toContainText(String(counts.maker));
  await expect(page.locator('[data-theme-chip="industry"]')).toContainText(String(counts.industry));
});

test('en route page renders theme chips with English labels', async ({ page }) => {
  await gotoRoute(page, { path: '/en/route', name: 'route-en', locale: 'en' });

  await expect(page.locator('[data-theme-filter="true"]')).toHaveCount(1);
  const counts = countThemes(routeCities);
  await expect(page.locator('[data-theme-chip="all"]')).toHaveText('All');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText('STEM');
  await expect(page.locator('[data-theme-chip="science"]')).toContainText(String(counts.science));
  await expect(page.locator('[data-theme-chip="maker"]')).toContainText('Makers');
  await expect(page.locator('[data-theme-chip="industry"]')).toContainText('Industry');
});

test('selecting a theme highlights matches and dims the rest; origin stays lit', async ({
  page,
}) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });
  await expect(page.locator(MAPLIBRE_CANVAS).first()).toBeAttached({ timeout: 15_000 });
  await page.locator('[data-theme-chip="science"]').click();
  const matched = routeCities.filter((c) => c.themes.includes('science' as never)).length;
  const dimmed = routeCities.filter(
    (c) => !c.isOrigin && !c.themes.includes('science' as never),
  ).length;
  // Markers exist in both layouts; :visible counts only the displayed map.
  await expect
    .poll(() => page.locator('[data-route-city="true"][data-theme-match="true"]:visible').count())
    .toBe(matched);
  await expect
    .poll(() => page.locator('[data-route-city="true"][data-dimmed="true"]:visible').count())
    .toBe(dimmed);
  await expect(
    page.locator('[data-route-city="true"][data-city-id="shenzhen"][data-dimmed="true"]:visible'),
  ).toHaveCount(0);
});

test('clicking the active theme again clears the dim', async ({ page }) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });
  await expect(page.locator(MAPLIBRE_CANVAS).first()).toBeAttached({ timeout: 15_000 });
  const chip = page.locator('[data-theme-chip="science"]');
  await chip.click();
  await expect
    .poll(() => page.locator('[data-route-city="true"][data-dimmed="true"]:visible').count())
    .toBeGreaterThan(0);
  await chip.click();
  await expect
    .poll(() => page.locator('[data-route-city="true"][data-dimmed="true"]:visible').count())
    .toBe(0);
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
});

test('clicking a city marker selects it (marker highlighted) and opens its CityPanel', async ({
  page,
}) => {
  await installHarnessGuards(page);
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });
  await selectCityMarker(page, 'liuzhou');
  await expect(
    page.locator('[data-route-city="true"][data-city-id="liuzhou"].mlc-marker--selected:visible'),
  ).toHaveCount(1);
  await expect(page.getByRole('article').first()).toContainText('柳州');
});

// ── Phase 5: Loader-level tests ──────────────────────────────────────────────

test('loadStops(zh) returns stops in contiguous order with parsed body fields', async () => {
  const stops = await loadStops('zh');
  expect(stops.length).toBeGreaterThan(0);
  // Orders are contiguous from 0 regardless of how many stops exist.
  expect(stops.map((s) => s.order)).toEqual(stops.map((_, i) => i));
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
