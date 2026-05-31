import { expect, test } from '@playwright/test';
import { buildRouteSource, provinceSource } from '../../src/features/route-map/map-style';
import type { Stop } from '../../src/features/route-map/stops-loader';

const stops = [
  { order: 1, label: 'A', lng: 113.2, lat: 23.1, visited: true },
  { order: 2, label: 'B', lng: 109.4, lat: 24.3, visited: true },
  { order: 3, label: 'C', lng: 106.7, lat: 26.6, visited: false },
] as unknown as Stop[];

test('provinceSource is a non-empty GeoJSON FeatureCollection', () => {
  expect(provinceSource.type).toBe('geojson');
  const data = provinceSource.data as { type: string; features: unknown[] };
  expect(data.type).toBe('FeatureCollection');
  expect(data.features.length).toBeGreaterThan(20); // ~34 provinces minus _JD
});

test('buildRouteSource makes one segment per adjacent pair, visited only when both ends visited', () => {
  const src = buildRouteSource(stops);
  const feats = (src.data as unknown as { features: { properties: { visited: boolean } }[] }).features;
  expect(feats.length).toBe(2); // 3 stops -> 2 segments
  expect(feats[0].properties.visited).toBe(true); // A->B both visited
  expect(feats[1].properties.visited).toBe(false); // B->C, C not visited
});
