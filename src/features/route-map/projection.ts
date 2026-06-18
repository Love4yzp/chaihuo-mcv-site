import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import chinaGeoJson from '@/data/china-provinces.json' with { type: 'json' };
import { MAP_HEIGHT, MAP_SCALE_DENOMINATOR, MAP_TRANSLATE_Y_OFFSET, MAP_WIDTH } from './constants';
import { isRouteOnlyCity, type ProjectedCity, type RouteCity } from './types';

export { bboxAt, labelDims, placeLabels, rectsOverlap } from './label-layout';

// ─── 马形路线（从设计师 DXF 导出，仿射变换适配 d3-geo 投影坐标）───
export const horseRouteD =
  'M473,445L446,450L438.39,424.4L433.76,409.2L438.97,375.11L417.72,343.01L361.33,340.87L325.98,353.08L260.39,339.59L239.16,356.46L246.45,366.64L272.85,364.39L276.21,369.07L273.91,382L258.63,380.85L240.83,381.29L220.2,367.2L218.99,360.29L233.39,320.94L196.83,303.59L178.32,321.61L187.57,346.64L171.38,357.13L164.12,315.48L192.56,283.92L202.93,282.16L234.6,284.33L230.96,228.09L216.61,208.6L205.58,213.78L196.1,211.37L175.9,220.8L169.93,220.36L163.01,227.95L153.4,221.06L152.44,207.01L159.37,201.08L187.96,180.2L193.85,165.17L213.35,151.76L212.87,131.1L223.54,137.29L226.24,147.5L237.06,140.48L237.92,151.05L256.87,150.5L272.39,165.54L296.15,175.15L288.58,177.88L312.34,204.12L323.38,206.83L326.37,221.62L342.19,216.05L338.07,228.21L362.48,243.67L398.43,246.27L411.56,235.3L454.34,219.72L472.3,227.36L478.62,198.55L506.15,154.6L530.95,142.77L564.26,118.63L567.79,124.28L576.4,114.81L586.43,104.52L601.22,99.75L594.25,114.19L623.33,95.86L619.45,129.1L598.66,150.27L615.73,149.47L592.52,167.15L573.7,166.18L556.34,174.7L535.06,201.16L515.59,202.94L479.96,237.69L492.94,250.85L507.46,281.08L509.09,298.32L504.36,343.86L514.8,350.35L568.68,316.58L569.79,326.68L564.53,348.67L546.36,355.33L509.2,369.71L488.89,359.71L469.61,331.84L465.86,379.47L449.71,416L471.84,425L486.5,438L481.486,440.865L473,445Z';

// ─── 地图投影 ───
export { MAP_HEIGHT, MAP_WIDTH } from './constants';

interface ProvinceProperties {
  adcode?: string | number;
  name?: string;
  [key: string]: unknown;
}

type ProvinceGeometry = MultiPolygon | Polygon;
type ChinaMapData = FeatureCollection<ProvinceGeometry, ProvinceProperties>;

function rewindGeometry(geom: ProvinceGeometry): ProvinceGeometry {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((ring) => [...ring].reverse()),
    };
  } else if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((polygon) => polygon.map((ring) => [...ring].reverse())),
    };
  }
  return geom;
}

// 过滤掉"南海诸岛/九段线"feature（adcode = 100000_JD）并修正多边形绕向以防止 D3 渲染为全幅背景
const rawGeo = chinaGeoJson as unknown as ChinaMapData;
export const geoData: ChinaMapData = {
  ...rawGeo,
  features: rawGeo.features
    .filter((f) => {
      const ad = f.properties?.adcode;
      const name = f.properties?.name;
      if (typeof ad === 'string' && ad.includes('_JD')) return false;
      if (!name) return false;
      return true;
    })
    .map((f) => ({
      ...f,
      geometry: rewindGeometry(f.geometry),
    })),
};

// 居中中国版图，略微缩小 scale，移除下沉 translate，使其在 3:2 容器中完美完整地呈现
export const projection = geoMercator()
  .center([105, 36])
  .scale(MAP_WIDTH / MAP_SCALE_DENOMINATOR)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + MAP_TRANSLATE_Y_OFFSET]);

export const pathGenerator = geoPath().projection(projection);

export function getElevationOffset(altitude: string): number {
  const altitudeVal = parseFloat(altitude) || 0;
  // Guard against below-sea-level altitudes: Math.sqrt(negative) is NaN, which
  // would poison the SVG coordinates downstream.
  return Math.sqrt(Math.max(0, altitudeVal)) * 1.5;
}

// ─── label placement (auto, no manual offsets) ───
export function projectCities(cities: RouteCity[]): ProjectedCity[] {
  const sorted = [...cities].sort((a, b) => a.order - b.order);
  const lastVisited = [...sorted].reverse().find((c) => c.visited && !isRouteOnlyCity(c));
  return sorted.flatMap((c) => {
    const p = projection([c.lng, c.lat]);
    if (!p) return [];
    const isRouteOnly = isRouteOnlyCity(c);
    const isLatest = !!lastVisited && c.label === lastVisited.label;
    return [
      {
        ...c,
        cx: p[0],
        cy: p[1],
        elevationOffset: getElevationOffset(c.altitude),
        isLatest,
        showLabel: !isRouteOnly && (c.visited || !!c.isOrigin || !!c.anchor),
        fontSize: isLatest ? 11 : c.visited ? 10.5 : 9,
      },
    ];
  });
}

// 城市连线路径 — 已按 order 排序（projectCities 处理）
export function buildCityLines(cities: ProjectedCity[]) {
  const segments: { from: ProjectedCity; to: ProjectedCity; visited: boolean }[] = [];
  for (let i = 0; i < cities.length - 1; i++) {
    segments.push({
      from: cities[i],
      to: cities[i + 1],
      // A segment is visited only if BOTH endpoints are visited
      visited: cities[i].visited && cities[i + 1].visited,
    });
  }
  return segments;
}
