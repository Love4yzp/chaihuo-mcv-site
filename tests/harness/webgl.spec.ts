import { expect, test } from '@playwright/test';

// De-risking gate: MapLibre needs a working WebGL context. Headless chromium
// uses SwiftShader. Confirm a context is obtainable before we build the map.
test('headless chromium provides a usable WebGL context', async ({ page }) => {
  await page.goto('/'); // any served page; we only need a browser context
  const ok = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  });
  expect(ok, 'WebGL must be available for MapLibre in headless chromium').toBe(true);
});
