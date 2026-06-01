import type { Feature, LineString } from 'geojson';
import { horseRouteD, projection } from './projection';

// The horse path is authored in SVG coords and rendered with transform
// translate(50,50). Undo that offset, then invert the d3 projection that maps
// lng/lat -> SVG, to recover geographic coordinates MapLibre can render.
const HORSE_OFFSET_X = 50;
const HORSE_OFFSET_Y = 50;

/** Parse the `M x,y L x,y ...` (and space-separated) horse path into [x,y] points. */
function parsePathPoints(d: string): [number, number][] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return [];
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
  }
  return pts;
}

// Target lng/lat box (well inside China) to CONTAIN the horse motif — the raw
// inverted path overshoots China's borders, so we fit it here. Tweak to taste.
const HORSE_TARGET = { minLng: 80, minLat: 22, maxLng: 128, maxLat: 50 };

/** Uniformly scale + translate coords to fit (centered, undistorted) inside `box`. */
function fitInto(
  coords: [number, number][],
  box: { minLng: number; minLat: number; maxLng: number; maxLat: number },
): [number, number][] {
  if (coords.length === 0) return coords;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const tw = box.maxLng - box.minLng;
  const th = box.maxLat - box.minLat;
  const scale = Math.min(tw / w, th / h); // uniform → no distortion
  const offX = box.minLng + (tw - w * scale) / 2 - minX * scale;
  const offY = box.minLat + (th - h * scale) / 2 - minY * scale;
  return coords.map(([x, y]) => [x * scale + offX, y * scale + offY]);
}

export function horseRouteGeoJson(): Feature<LineString> {
  const svgPoints = parsePathPoints(horseRouteD);
  const inverted: [number, number][] = [];
  for (const [x, y] of svgPoints) {
    const lngLat = projection.invert?.([x + HORSE_OFFSET_X, y + HORSE_OFFSET_Y]);
    if (lngLat) inverted.push([lngLat[0], lngLat[1]]);
  }
  // Constrain the motif inside China (no clip — fit by scale+translate).
  const coordinates = fitInto(inverted, HORSE_TARGET);
  return {
    type: 'Feature',
    properties: { kind: 'horse' },
    geometry: { type: 'LineString', coordinates },
  };
}
