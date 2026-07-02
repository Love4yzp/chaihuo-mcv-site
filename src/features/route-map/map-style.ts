import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import { geoData } from './projection';
import type { Stop } from './stops-loader';
import { PROVINCE_VISITED } from './visited-provinces';

// Mainland-China framing; keeps the whole national outline (never tight-crop).
export const CHINA_BOUNDS: [[number, number], [number, number]] = [
  [73.5, 17.5],
  [135.5, 53.8],
];

// Map paper background. Single source of truth (MapLibre styles can't read CSS
// vars, so the SSR skeleton imports this constant instead of hardcoding the hex).
export const MAP_BG = '#ebdcb9';

// Province silhouette source — reuse the already-filtered geoData (no _JD).
export const provinceSource = {
  type: 'geojson' as const,
  data: geoData as unknown as FeatureCollection,
};

/** Catmull-Rom spline sample between p1→p2 using neighbours p0,p3 (smooth corners). */
function catmullRom(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  steps: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const calc = (a: number, b: number, c: number, d: number) =>
      0.5 *
      (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([calc(p0[0], p1[0], p2[0], p3[0]), calc(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

/**
 * One SMOOTHED LineString per adjacent stop pair (Catmull-Rom through the stops
 * so corners flow instead of kinking); visited iff BOTH endpoints visited.
 * Per-pair features preserve the solid(visited)/dashed(planned) paint split.
 */
export function buildRouteSource(stops: Stop[]) {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  const pts = sorted.map((s) => [s.lng, s.lat] as [number, number]);
  const features: Feature<LineString>[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    features.push({
      type: 'Feature',
      properties: { visited: sorted[i].visited && sorted[i + 1].visited },
      geometry: { type: 'LineString', coordinates: catmullRom(p0, p1, p2, p3, 14) },
    });
  }
  return {
    type: 'geojson' as const,
    data: { type: 'FeatureCollection', features } as FeatureCollection,
  };
}

/**
 * Tile-less MapLibre style: blank background + our own GeoJSON layers, styled
 * to read as the hand-drawn watercolor silhouette. No glyphs/sprite/tiles.
 */
export function buildMapStyle(
  routeData: FeatureCollection,
  horse: Feature<LineString>,
): StyleSpecification {
  return {
    version: 8,
    name: 'chaihuo-handdrawn',
    sources: {
      provinces: provinceSource,
      route: { type: 'geojson', data: routeData },
      horse: { type: 'geojson', data: horse },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': MAP_BG } },
      {
        id: 'province-fill',
        type: 'fill',
        source: 'provinces',
        paint: {
          'fill-color': [
            'case',
            ['in', ['get', 'name'], ['literal', PROVINCE_VISITED]],
            '#fdf1b8',
            '#ffffff',
          ],
          'fill-opacity': 0.96,
        },
      },
      {
        id: 'province-line',
        type: 'line',
        source: 'provinces',
        paint: { 'line-color': '#d9d2c0', 'line-width': 0.8 },
      },
      {
        id: 'horse',
        type: 'line',
        source: 'horse',
        paint: { 'line-color': '#f3d230', 'line-width': 4, 'line-opacity': 0.22 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      },
      {
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': ['case', ['get', 'visited'], '#eab308', '#c9b78a'],
          'line-width': ['case', ['get', 'visited'], 3.5, 2],
          'line-dasharray': ['case', ['get', 'visited'], ['literal', [1, 0]], ['literal', [2, 2]]],
          'line-opacity': 1,
          'line-opacity-transition': { duration: 300 },
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      },
    ],
  } as StyleSpecification;
}
