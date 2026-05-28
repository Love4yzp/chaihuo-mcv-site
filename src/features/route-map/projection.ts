import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import chinaGeoJson from "@/data/china-provinces.json";
import type { RouteCity } from "./types";
import type { Locale } from "@/i18n/index";
import { MAP_HEIGHT, MAP_SCALE_DENOMINATOR, MAP_TRANSLATE_Y_OFFSET, MAP_WIDTH } from "./constants";
import type { ProjectedCity } from "./types";
export { bboxAt, labelDims, placeLabels, rectsOverlap } from "./label-layout";

// ─── 马形路线（从设计师 DXF 导出，仿射变换适配 d3-geo 投影坐标）───
export const horseRouteD = 'M 508,453 L 446,450 L 438.39,424.40 L 433.76,409.20 L 438.97,375.11 L 417.72,343.01 L 361.33,340.87 L 325.98,353.08 L 260.39,339.59 L 239.16,356.46 L 246.45,366.64 L 272.85,364.39 L 276.21,369.07 L 273.91,382.00 L 258.63,380.85 L 240.83,381.29 L 220.20,367.20 L 218.99,360.29 L 233.39,320.94 L 196.83,303.59 L 178.32,321.61 L 187.57,346.64 L 171.38,357.13 L 164.12,315.48 L 192.56,283.92 L 202.93,282.16 L 234.60,284.33 L 230.96,228.09 L 216.61,208.60 L 205.58,213.78 L 196.10,211.37 L 175.90,220.80 L 169.93,220.36 L 163.01,227.95 L 153.40,221.06 L 152.44,207.01 L 159.37,201.08 L 187.96,180.20 L 193.85,165.17 L 213.35,151.76 L 212.87,131.10 L 223.54,137.29 L 226.24,147.50 L 237.06,140.48 L 237.92,151.05 L 256.87,150.50 L 272.39,165.54 L 296.15,175.15 L 288.58,177.88 L 312.34,204.12 L 323.38,206.83 L 326.37,221.62 L 342.19,216.05 L 338.07,228.21 L 362.48,243.67 L 398.43,246.27 L 411.56,235.30 L 454.34,219.72 L 472.30,227.36 L 478.62,198.55 L 506.15,154.60 L 530.95,142.77 L 564.26,118.63 L 567.79,124.28 L 576.40,114.81 L 586.43,104.52 L 601.22,99.75 L 594.25,114.19 L 623.33,95.86 L 619.45,129.10 L 598.66,150.27 L 615.73,149.47 L 592.52,167.15 L 573.70,166.18 L 556.34,174.70 L 535.06,201.16 L 515.59,202.94 L 479.96,237.69 L 492.94,250.85 L 507.46,281.08 L 509.09,298.32 L 504.36,343.86 L 514.80,350.35 L 568.68,316.58 L 569.79,326.68 L 564.53,348.67 L 546.36,355.33 L 509.20,369.71 L 488.89,359.71 L 469.61,331.84 L 465.86,379.47 L 449.71,416 L 484.34,432 L 492,440 L 508,453 Z';

// ─── 地图投影 ───
export { MAP_HEIGHT, MAP_WIDTH } from "./constants";

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
      coordinates: geom.coordinates.map((polygon) =>
        polygon.map((ring) => [...ring].reverse()),
      ),
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
      geometry: rewindGeometry(f.geometry)
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
  const lastVisited = [...sorted].reverse().find((c) => c.visited);
  return sorted.flatMap((c) => {
    const p = projection([c.lng, c.lat]);
    if (!p) return [];
    const isLatest = !!lastVisited && c.label === lastVisited.label;
    return [{
      ...c,
      cx: p[0],
      cy: p[1],
      elevationOffset: getElevationOffset(c.altitude),
      isLatest,
      showLabel: c.visited || !!c.isOrigin || !!c.anchor,
      fontSize: isLatest ? 11 : c.visited ? 10.5 : 9,
    }];
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

// Localize a single city to the active locale (uses _en fields when present)
export function localizeCity(c: RouteCity, locale: Locale): RouteCity {
  if (locale === 'zh') return c;
  const next: RouteCity = { ...c };
  if (c.label_en) next.label = c.label_en;
  if (c.event) {
    next.event = {
      ...c.event,
      summary: c.event.summary_en ?? c.event.summary,
      linkLabel: c.event.linkLabel_en ?? c.event.linkLabel,
    };
  }
  return next;
}
