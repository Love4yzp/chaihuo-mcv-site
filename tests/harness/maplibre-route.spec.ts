import { expect, test } from '@playwright/test';
import { installHarnessGuards } from './helpers';

test.describe('maplibre /route-next', () => {
  test('renders the MapLibre canvas and one marker per stop, click opens CityPanel', async ({
    page,
  }) => {
    await installHarnessGuards(page);
    await page.goto('/route-next', { waitUntil: 'domcontentloaded' });

    // RouteContent renders MapLibreCanvas twice: once in the desktop split-screen layout
    // (`hidden lg:grid`) and once in the mobile layout (`lg:hidden`). The
    // data-maplibre-canvas container is `absolute inset-0` and reports h=0 in
    // getBoundingClientRect even when visible — only the maplibregl-canvas element
    // itself has reliable dimensions. Poll until a canvas with positive dimensions
    // appears (covers both viewport sizes).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const canvases = Array.from(
              document.querySelectorAll('[data-maplibre-canvas="true"] canvas.maplibregl-canvas'),
            ) as HTMLElement[];
            return canvases.some((c) => {
              const r = c.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
          }),
        { timeout: 15_000, message: 'MapLibre canvas with positive dimensions must appear' },
      )
      .toBe(true);

    // Determine which canvas has positive dimensions (the visible one) and get its
    // parent data-maplibre-canvas container index for scoping marker assertions.
    const visibleIdx = await page.evaluate(() => {
      const canvases = Array.from(
        document.querySelectorAll('[data-maplibre-canvas="true"] canvas.maplibregl-canvas'),
      ) as HTMLElement[];
      const idx = canvases.findIndex((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return idx >= 0 ? idx : 0;
    });

    // The visible canvas confirms WebGL is up and the map is rendered.
    const canvas = page
      .locator('[data-maplibre-canvas="true"] canvas.maplibregl-canvas')
      .nth(visibleIdx);
    // Use toHaveAttribute instead of toBeVisible since the parent container
    // (absolute inset-0 div) may report h=0 confusing Playwright's visibility check.
    // Instead verify the canvas has a positive width attribute set by MapLibre.
    await expect(canvas).toBeAttached();
    const canvasWidth = await canvas.getAttribute('width');
    expect(Number(canvasWidth)).toBeGreaterThan(0);

    // One HTML marker button per stop (the route currently has 9 stops).
    // Scope to the visible map container to avoid double-counting both instances.
    // The canvas is at nth(visibleIdx); its container is at the same index.
    const mapContainer = page.locator('[data-maplibre-canvas="true"]').nth(visibleIdx);
    const markers = mapContainer.locator('.mlc-marker');
    await expect(markers).toHaveCount(9);

    // Clicking a marker selects that city and the CityPanel (an <article>) shows it.
    // force: true is required because the MapLibre GL container div can intercept
    // pointer events on the marker buttons.
    const shenzhen = mapContainer.locator('.mlc-marker[data-city-label="深圳"]');
    await shenzhen.click({ force: true });
    // CityPanel (motion.article) is rendered in both desktop and mobile slots;
    // use .first() to avoid strict-mode violations when both articles exist in the DOM.
    const panel = page.getByRole('article');
    await expect(panel.first()).toContainText('深圳');
  });
});
