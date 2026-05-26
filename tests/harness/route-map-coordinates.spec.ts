import { test, expect } from '@playwright/test';
import { geoMercator } from 'd3-geo';
import { routeCities } from '../../src/data/route-cities';
import { gotoRoute } from './helpers';

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const projection = geoMercator()
  .center([105, 36])
  .scale(MAP_WIDTH / 1.48)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 10]);

const sortedCities = [...routeCities].sort((a, b) => a.order - b.order);

function expectedPoint(city: (typeof sortedCities)[number]) {
  const point = projection([city.lng, city.lat]);
  if (!point) throw new Error(`Could not project ${city.id}`);
  return { id: city.id, x: point[0], y: point[1] };
}

test('route page city hit areas sit on geographic coordinates', async ({ page }) => {
  await gotoRoute(page, { path: '/route', name: 'route-zh', locale: 'zh' });

  const points = await page.locator('circle[fill="transparent"]').evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((node) => ({
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
