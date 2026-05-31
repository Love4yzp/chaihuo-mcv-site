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

export function horseRouteGeoJson(): Feature<LineString> {
  const svgPoints = parsePathPoints(horseRouteD);
  const coordinates: [number, number][] = [];
  for (const [x, y] of svgPoints) {
    const lngLat = projection.invert?.([x + HORSE_OFFSET_X, y + HORSE_OFFSET_Y]);
    if (lngLat) coordinates.push([lngLat[0], lngLat[1]]);
  }
  return {
    type: 'Feature',
    properties: { kind: 'horse' },
    geometry: { type: 'LineString', coordinates },
  };
}
