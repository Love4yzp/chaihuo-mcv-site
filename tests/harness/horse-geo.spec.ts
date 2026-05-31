import { expect, test } from '@playwright/test';
import { horseRouteGeoJson } from '../../src/features/route-map/horse-geo';

test('horse route inverts to a GeoJSON LineString inside China bbox', () => {
  const fc = horseRouteGeoJson();
  expect(fc.type).toBe('Feature');
  expect(fc.geometry.type).toBe('LineString');
  const coords = fc.geometry.coordinates;
  expect(coords.length).toBeGreaterThan(50); // horseRouteD has ~90 points
  // Every coordinate must be plausible mainland-China lng/lat
  for (const [lng, lat] of coords) {
    expect(lng).toBeGreaterThan(73);
    expect(lng).toBeLessThan(136);
    expect(lat).toBeGreaterThan(17);
    expect(lat).toBeLessThan(54);
  }
});
