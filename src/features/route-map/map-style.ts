import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import { geoData } from './projection';
import type { Stop } from './stops-loader';

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

/** One LineString per adjacent stop pair; visited iff BOTH endpoints visited. */
export function buildRouteSource(stops: Stop[]) {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  const features: Feature<LineString>[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    features.push({
      type: 'Feature',
      properties: { visited: from.visited && to.visited },
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
    });
  }
  return {
    type: 'geojson' as const,
    data: { type: 'FeatureCollection', features } as FeatureCollection,
  };
}

const PROVINCE_VISITED = ['广东', '广西', '贵州', '四川'];

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
            '#fdf6d2',
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
