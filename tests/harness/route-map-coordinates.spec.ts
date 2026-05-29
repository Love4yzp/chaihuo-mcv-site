import { test, expect, type Page } from '@playwright/test';
import { geoMercator } from 'd3-geo';
import { loadStops } from './lib/load-stops';
import type { Stop as RouteCity } from '../../src/features/route-map/stops-loader';
import { placeLabels } from '../../src/features/route-map/label-layout';
import { cityMatchesTheme, countThemes, THEME_ORDER } from '../../src/features/route-map/theme';
import {
  MAP_HEIGHT,
  MAP_SCALE_DENOMINATOR,
  MAP_TRANSLATE_Y_OFFSET,
  MAP_WIDTH,
} from '../../src/features/route-map/constants';
import type { ProjectedCity } from '../../src/features/route-map/types';
import { centerOn, IDENTITY } from '../../src/features/route-map/useMapZoom';
import { gotoRoute } from './helpers';

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

function makeProjectedCity(overrides: Partial<ProjectedCity> & Pick<ProjectedCity, 'id' | 'label' | 'cx' | 'cy'>): ProjectedCity {
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
  return page.locator(`${svgSelector} path[fill="#ffffff"], ${svgSelector} path[fill="#fdf6d2"]`).evaluateAll((nodes) => {
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

function expectedRouteEndpoint(city: (typeof sortedCities)[number]) {
  const point = expectedPoint(city);
  const elevationOffset = Math.sqrt(parseFloat(city.altitude) || 0) * 1.5;
  return { ...point, y: point.y - elevationOffset };
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
    makeProjectedCity({ id: 'origin', label: '深圳', cx: 100, cy: 100, order: 0, isOrigin: true, visited: true }),
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

test('centerOn places the target point at the canvas center', () => {
  const t = centerOn([200, 150], 3, 900, 600);
  expect(t.k).toBe(3);
  expect(t.x + t.k * 200).toBeCloseTo(450, 5);
  expect(t.y + t.k * 150).toBeCloseTo(300, 5);
});

test('IDENTITY is the no-op transform', () => {
  expect(IDENTITY).toEqual({ x: 0, y: 0, k: 1 });
});

test('route page city hit areas sit on elevation projection endpoints', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const points = await page.locator('circle[fill="transparent"]').evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.height > 0;
      })
      .map((node) => ({
        x: Number(node.getAttribute('cx')),
        y: Number(node.getAttribute('cy')),
      })),
  );

  expect(points).toHaveLength(sortedCities.length);
  for (const [index, actual] of points.entries()) {
    const expected = expectedRouteEndpoint(sortedCities[index]);
    expect(actual.x, `${expected.id} x`).toBeCloseTo(expected.x, 0);
    expect(actual.y, `${expected.id} y`).toBeCloseTo(expected.y, 0);
  }
});

test('route page keeps elevation projection as a visual layer only', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const lines = await page.locator('[data-route-elevation-line="true"]').evaluateAll((nodes) =>
    Array.from(
      nodes
        .reduce((byId, node) => {
          const id = node.getAttribute('data-city-id');
          if (id && !byId.has(id)) {
            byId.set(id, {
              id,
              x1: Number(node.getAttribute('x1')),
              y1: Number(node.getAttribute('y1')),
              x2: Number(node.getAttribute('x2')),
              y2: Number(node.getAttribute('y2')),
            });
          }
          return byId;
        }, new Map<string, { id: string; x1: number; y1: number; x2: number; y2: number }>())
        .values(),
    ),
  );

  expect(lines).toHaveLength(sortedCities.length);
  for (const [index, line] of lines.entries()) {
    const expected = expectedPoint(sortedCities[index]);
    expect(line.id).toBe(expected.id);
    expect(line.x1, `${expected.id} projection anchor x`).toBeCloseTo(expected.x, 0);
    expect(line.y1, `${expected.id} projection anchor y`).toBeCloseTo(expected.y, 0);
    expect(line.x2, `${expected.id} projection line x`).toBeCloseTo(expected.x, 0);
    expect(line.y2, `${expected.id} projection should render above anchor`).toBeLessThan(line.y1);
  }
});

test('route page visible labels render near a city dot', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const labelBoxes = await page.locator('[data-route-city-label="true"]').evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getClientRects().length > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { id: n.getAttribute('data-city-id'), cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
      }),
  );
  const dotCenters = await page.locator('main svg circle[fill="transparent"]').evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getBoundingClientRect().height > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
      }),
  );

  expect(labelBoxes.length).toBeGreaterThan(0);
  for (const label of labelBoxes) {
    const nearest = Math.min(...dotCenters.map((d) => Math.hypot(d.cx - label.cx, d.cy - label.cy)));
    expect(nearest, `label ${label.id} should sit near a dot`).toBeLessThan(70);
  }
});

test('route page shows key labels and never the origin helper text', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const visible = await getVisibleLabelIds(page);
  // Origin (shenzhen) + latest (chengdu) are always shown.
  expect(visible).toContain('shenzhen');
  expect(visible).toContain('chengdu');
  // Visible labels are a subset of the eligible set (crowded ones may be culled).
  for (const id of visible) {
    expect(expectedLabelIds).toContain(id);
  }
  await expect(page.locator('main svg text').filter({ hasText: '出发点' })).toHaveCount(0);
});

test('route page projection labels do not overlap each other', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const boxes = await getVisibleLabelBoxes(page);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesOverlap(boxes[i], boxes[j]), `${boxes[i].id} overlaps ${boxes[j].id}`).toBe(false);
    }
  }
});

test('route page China outline is scaled large enough for labels and horse route', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const box = await getVisibleProvinceFootprint(page, 'main svg');
  expect(box.x2 - box.x1).toBeGreaterThan(700);
  expect(box.y2 - box.y1).toBeGreaterThan(500);
  expect(box.x1).toBeGreaterThan(35);
  expect(box.x2).toBeLessThan(MAP_WIDTH - 40);
  expect(box.y1).toBeGreaterThan(35);
});

test('home preview city dots sit on geographic coordinates', async ({ page }) => {
  await gotoRoute(page, { path: '/', name: 'home-zh', locale: 'zh' });

  const points = await page.locator('svg[role="img"] circle[stroke="#fffaf0"]').evaluateAll((nodes) =>
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
      expect(boxesOverlap(boxes[i], boxes[j]), `${boxes[i].id} overlaps ${boxes[j].id}`).toBe(false);
    }
  }
});

test('route page exposes a recenter control and zooms in on city click', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const recenter = page.getByRole('button', { name: /回到|recenter|full/i });
  await expect(recenter).toBeVisible();

  // The route map SVG has touch-none + cursor-grab classes; the first <g> child
  // of that specific SVG is the scaled (zoomable) group.
  const scaledGroup = page.locator('main svg.touch-none > g').first();
  const scaleOf = async () => {
    const t = (await scaledGroup.getAttribute('transform')) ?? '';
    const m = t.match(/scale\(([\d.]+)\)/);
    return m ? Number(m[1]) : 1;
  };

  // Click a crowded southern city's hit area to zoom in (nth(1) = 广州, order 1).
  // JS dispatch avoids SVG viewBox / mobile pointer-interception flakiness.
  await page.locator('main svg circle[fill="transparent"]').nth(1).dispatchEvent('click');
  await expect.poll(scaleOf, { timeout: 4000 }).toBeGreaterThan(1.2);

  // Recenter returns to the full overview (scale ~1).
  // page.evaluate with querySelector + composed:true is the only method that reliably
  // reaches React 19's delegated event handler on mobile viewports.
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="回到全图"]') as HTMLElement | null;
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  });
  await expect.poll(scaleOf, { timeout: 4000 }).toBeLessThan(1.05);
});

// ── Phase 2: Expedition log / people / photo panel tests ──────────────────────
// RouteContent renders TWO CityPanel instances: one in the desktop split layout
// (visible on lg+ via `hidden lg:grid`) and one in the mobile bottom drawer
// (hidden on lg+ via `lg:hidden`). On chromium-desktop only the desktop panel
// is visible, so :visible filtering resolves each locator to exactly one element.

test('route page renders expedition log + people + photo for a stop with data', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 柳州 (order 5) — has expedition, 1 person, 1 photo.
  await page.evaluate((i) =>
    document.querySelectorAll('main svg circle[fill="transparent"]')[i].dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    ), 5);

  const expeditionLog = page.locator('[data-expedition-log="true"]:visible').first();
  await expect(expeditionLog).toBeVisible();
  // Assert a punctuation-free substring to avoid half/full-width punctuation fragility.
  await expect(expeditionLog).toContainText('养鱼塘');
  await expect(page.locator('[data-people-card="true"]:visible').first()).toBeVisible();
  await expect(page.locator('[data-photo-thumb="true"]:visible').first()).toBeVisible();
});

test('route page photo thumbnail opens a lightbox dialog', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 柳州 (order 5).
  await page.evaluate((i) =>
    document.querySelectorAll('main svg circle[fill="transparent"]')[i].dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    ), 5);

  await page.locator('[data-photo-thumb="true"]:visible').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('img')).toBeVisible();
});

test('route page falls back gracefully for a stop without expedition data', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  // Select 深圳 (order 0) — no expedition data; shows event.summary instead.
  await page.evaluate((i) =>
    document.querySelectorAll('main svg circle[fill="transparent"]')[i].dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    ), 0);

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
  await expect.poll(() => countVisibleCityGroups(page, '[data-theme-match="true"]')).toBe(5);
  await expect.poll(() => countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(3);
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
  await expect.poll(() => countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(3);
  await expect.poll(() => visibleSegmentLayerOpacity(page)).toBe('0.2');

  await chip.click(); // toggle off
  await expect.poll(() => countVisibleCityGroups(page, '[data-dimmed="true"]')).toBe(0);
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => visibleSegmentLayerOpacity(page)).toBe('1');
});

// ── Phase 5: Loader-level tests ──────────────────────────────────────────────

test('loadStops(zh) returns 9 stops in order with parsed body fields', async () => {
  const stops = await loadStops('zh');
  expect(stops.length).toBe(9);
  expect(stops.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
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
