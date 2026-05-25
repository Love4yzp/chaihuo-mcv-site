import { Fragment, useState, useCallback, useRef, useEffect, useMemo, type ReactElement } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import ReactSlick from "react-slick";
// Vite 8 CJS interop: default export is nested
const Slider = (
  "default" in ReactSlick ? (ReactSlick as any).default : ReactSlick
) as typeof ReactSlick;
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Play, ChevronDown, ArrowUpRight, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import chinaGeoJson from "@/data/china-provinces.json";
import { routeCities, type RouteCity } from "@/data/route-cities";
import {
  fadeUp,
  fadeLeft,
  fadeRight,
  fadeIn,
  stagger,
  springTransition,
  defaultViewport,
  buttonPress,
} from "../components/motion";
import type { Locale } from '@/i18n/index';
import { localePath } from '@/i18n/index';
import RoleTimeline from './RoleTimeline';
import AntigravityCard from './AntigravityCard';

// ─── Types ───

interface HeroImage {
  image: string;
  alt?: string;
}

interface TimelineSegment {
  id: string;
  role: string;
  crewId: string;
  name: string;
  image: string;
  startDate: string;
  endDate: string | null;
  handoffName: string | null;
  startLocation: string;
  endLocation: string | null;
}

interface TimelineData {
  roles: Array<{ key: string; label: string }>;
  segments: TimelineSegment[];
  monthMarkers: Array<{ label: string; pct: number }>;
  projectStart: string;
  projectEnd: string;
}

interface Props {
  heroImages: HeroImage[];
  timeline: TimelineData;
  locale?: Locale;
  t: Record<string, string>;
}

// ─── CountUp Component ───

function CountUp({ end, label }: { end: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const numericPart = parseFloat(end.replace(/[^0-9.]/g, ""));
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => {
    if (end.includes("W")) return v.toFixed(1) + "W";
    if (end.includes("+")) return Math.round(v) + "+";
    return Math.round(v).toString();
  });

  useEffect(() => {
    if (isInView) {
      animate(motionVal, numericPart, { duration: 1.5, ease: "easeOut" });
    }
  }, [isInView]);

  return (
    <div ref={ref}>
      <motion.div className="font-bold mb-2 text-[40px] text-brand">
        {display}
      </motion.div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}

// ─── 马形路线（从设计师 DXF 导出，仿射变换适配 d3-geo 投影坐标）───
const horseRouteD = 'M 508,453 L 446,450 L 438.39,424.40 L 433.76,409.20 L 438.97,375.11 L 417.72,343.01 L 361.33,340.87 L 325.98,353.08 L 260.39,339.59 L 239.16,356.46 L 246.45,366.64 L 272.85,364.39 L 276.21,369.07 L 273.91,382.00 L 258.63,380.85 L 240.83,381.29 L 220.20,367.20 L 218.99,360.29 L 233.39,320.94 L 196.83,303.59 L 178.32,321.61 L 187.57,346.64 L 171.38,357.13 L 164.12,315.48 L 192.56,283.92 L 202.93,282.16 L 234.60,284.33 L 230.96,228.09 L 216.61,208.60 L 205.58,213.78 L 196.10,211.37 L 175.90,220.80 L 169.93,220.36 L 163.01,227.95 L 153.40,221.06 L 152.44,207.01 L 159.37,201.08 L 187.96,180.20 L 193.85,165.17 L 213.35,151.76 L 212.87,131.10 L 223.54,137.29 L 226.24,147.50 L 237.06,140.48 L 237.92,151.05 L 256.87,150.50 L 272.39,165.54 L 296.15,175.15 L 288.58,177.88 L 312.34,204.12 L 323.38,206.83 L 326.37,221.62 L 342.19,216.05 L 338.07,228.21 L 362.48,243.67 L 398.43,246.27 L 411.56,235.30 L 454.34,219.72 L 472.30,227.36 L 478.62,198.55 L 506.15,154.60 L 530.95,142.77 L 564.26,118.63 L 567.79,124.28 L 576.40,114.81 L 586.43,104.52 L 601.22,99.75 L 594.25,114.19 L 623.33,95.86 L 619.45,129.10 L 598.66,150.27 L 615.73,149.47 L 592.52,167.15 L 573.70,166.18 L 556.34,174.70 L 535.06,201.16 L 515.59,202.94 L 479.96,237.69 L 492.94,250.85 L 507.46,281.08 L 509.09,298.32 L 504.36,343.86 L 514.80,350.35 L 568.68,316.58 L 569.79,326.68 L 564.53,348.67 L 546.36,355.33 L 509.20,369.71 L 488.89,359.71 L 469.61,331.84 L 465.86,379.47 L 449.71,416 L 484.34,432 L 492,440 L 508,453 Z';

// ─── 地图投影 ───
// viewBox 比例 = 容器 aspect-[3/2]，无横向留白浪费
const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;

// 过滤掉"南海诸岛/九段线"feature（adcode = 100000_JD），顶部腾出更多空间
const rawGeo = chinaGeoJson as unknown as FeatureCollection<MultiPolygon | Polygon>;
const geoData: FeatureCollection<MultiPolygon | Polygon> = {
  ...rawGeo,
  features: rawGeo.features.filter((f) => {
    const ad = (f.properties as any)?.adcode;
    const name = (f.properties as any)?.name;
    if (typeof ad === 'string' && ad.includes('_JD')) return false;
    if (!name) return false;
    return true;
  }),
};

// 手动投影参数 — 居中中国大陆，translate Y 下沉 50px 给顶部留白
const projection = geoMercator()
  .center([104, 35])
  .scale(MAP_WIDTH / 1.3)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 50]);

const pathGenerator = geoPath().projection(projection);

// ─── label placement (auto, no manual offsets) ───
// Convention follows mainstream maps (Google/Mapbox/Amap): label sits BELOW
// the dot by default; only swaps to N/E/W/diagonals when below collides.
type ProjectedCity = RouteCity & {
  cx: number;
  cy: number;
  isLatest: boolean;
  showLabel: boolean;
  fontSize: number;
};

type Rect = readonly [number, number, number, number]; // [x0, y0, x1, y1]

function projectCities(cities: RouteCity[]): ProjectedCity[] {
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
      isLatest,
      showLabel: c.visited || !!c.isOrigin || !!c.anchor,
      fontSize: isLatest ? 11 : c.visited ? 10.5 : 9,
    }];
  });
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

// Approximate label dims. Chinese chars are full-width; use a conservative
// 0.95 × fontSize per char so we leave a little air vs. the actual glyph.
function labelDims(c: ProjectedCity): { w: number; h: number } {
  return {
    w: c.label.length * c.fontSize * 0.95 + 2,
    h: c.fontSize * 1.1,
  };
}

// SVG <text> default anchor is left-baseline. baseline = cy + dy.
function bboxAt(c: ProjectedCity, dx: number, dy: number): Rect {
  const { w, h } = labelDims(c);
  const x0 = c.cx + dx;
  const y0 = c.cy + dy - h * 0.85;
  return [x0, y0, x0 + w, y0 + h];
}

// Map-software ordering: below-center first, then above, sides, diagonals.
function candidateOffsets(c: ProjectedCity): Array<[number, number]> {
  const { w, h } = labelDims(c);
  const PAD = c.isOrigin ? 16 : 7; // origin has a r=12 outer ring → push label out
  const half = PAD * 0.5;
  return [
    [-w / 2, PAD + h * 0.85],                  // S  (default — under the dot)
    [-w / 2, -PAD - h * 0.15],                 // N
    [PAD, h * 0.35],                           // E
    [-(w + PAD), h * 0.35],                    // W
    [half, PAD * 0.7 + h * 0.85],              // SE
    [-(w + half), PAD * 0.7 + h * 0.85],       // SW
    [half, -PAD * 0.7 - h * 0.15],             // NE
    [-(w + half), -PAD * 0.7 - h * 0.15],      // NW
  ];
}

function placeLabels(cities: ProjectedCity[]): Map<string, [number, number] | null> {
  const priority = (c: ProjectedCity) =>
    c.isLatest ? 4 : c.isOrigin ? 3 : c.visited ? 2 : c.anchor ? 1 : 0;
  const ordered = cities
    .filter((c) => c.showLabel)
    .sort((a, b) => priority(b) - priority(a));

  // dot bboxes for ALL cities — labels must avoid every dot, not just labeled ones
  const dotBoxes: Rect[] = cities.map((c) => {
    const r = c.isLatest || c.isOrigin ? 6 : c.visited ? 5 : 4;
    return [c.cx - r, c.cy - r, c.cx + r, c.cy + r];
  });

  const placed: Rect[] = [];
  const result = new Map<string, [number, number] | null>();

  for (const c of ordered) {
    let chosen: [number, number] | null = null;
    for (const [dx, dy] of candidateOffsets(c)) {
      const bb = bboxAt(c, dx, dy);
      if (placed.some((r) => rectsOverlap(r, bb))) continue;
      const hitsDot = cities.some(
        (other, i) => other.label !== c.label && rectsOverlap(dotBoxes[i], bb),
      );
      if (hitsDot) continue;
      chosen = [dx, dy];
      placed.push(bb);
      break;
    }
    result.set(c.label, chosen);
  }
  return result;
}

// 城市连线路径 — 已按 order 排序（projectCities 处理）
function buildCityLines(cities: ProjectedCity[]) {
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
function localizeCity(c: RouteCity, locale: Locale): RouteCity {
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

// 中国路线图 — 进度先行，马图浮现在后
function ChinaRouteMap({
  cities,
  selectedKey,
  onSelect,
  t,
}: {
  cities: RouteCity[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  t: Record<string, string>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(mapRef, { once: true, amount: 0.3 });

  const [rotate, setRotate] = useState({ x: 20, y: -8 }); // Isometric baseline tilt
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 0, y: 0 });

  const projected = useMemo(() => projectCities(cities), [cities]);
  const labelPositions = useMemo(() => placeLabels(projected), [projected]);
  const segments = useMemo(() => buildCityLines(projected), [projected]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const box = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - box.left - box.width / 2) / (box.width / 2);
    const y = (e.clientY - box.top - box.height / 2) / (box.height / 2);
    
    // Smooth 3D tilt tracking layered on top of baseline
    setRotate({
      x: 20 - y * 8, // tilt pitch range
      y: -8 + x * 8, // tilt yaw range
    });

    setGlarePos({
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 20, y: -8 }); // Reset smoothly to baseline
  };

  // Animation budget: cities first (0–1.2s), horse outline fades in after (1.0–2.5s)
  const cityDelay = (order: number, visited: boolean) =>
    visited ? 0.05 + order * 0.06 : 0.6 + order * 0.03;

  return (
    <div
      ref={mapRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1400, transformStyle: 'preserve-3d' }}
      className="relative w-full h-full bg-gradient-to-b from-neutral-50/50 to-neutral-100/90 border border-neutral-300/40 overflow-hidden rounded-2xl shadow-[inset_0_4px_30px_rgba(0,0,0,0.02),0_15px_40px_rgba(0,0,0,0.03)] p-6 transition-all duration-300"
    >
      {/* Background Holographic Tech Grid Layer */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.025] transition-opacity duration-500"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.35) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          transform: 'rotateX(55deg) scale(2.2) translateY(-10%)',
        }}
      />

      {/* Dynamic Hover Glow Backlight */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 select-none"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 380px at ${glarePos.x}px ${glarePos.y}px, rgba(243,210,48,0.1) 0%, transparent 80%)`,
        }}
      />

      {/* Tilted Holographic SandBox Map Board */}
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
        }}
        animate={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) rotateZ(2deg) translateZ(10px)`,
        }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 110,
          mass: 0.5,
        }}
        className="w-full h-full relative"
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full drop-shadow-[0_12px_35px_rgba(0,0,0,0.04)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 省份轮廓 */}
          <g>
            {geoData.features.map((feature) => {
              const raw = pathGenerator(feature);
              if (!raw) return null;
              const parts = raw.split(/(?=M)/);
              const d = parts.filter((p) => {
                const firstCoord = p.match(/^M([-\d.]+),([-\d.]+)/);
                if (!firstCoord) return false;
                const x = parseFloat(firstCoord[1]);
                const y = parseFloat(firstCoord[2]);
                return x > -100 && x < MAP_WIDTH + 100 && y > -100 && y < MAP_HEIGHT + 100;
              }).join('');
              if (!d) return null;
              return (
                <path
                  key={feature.properties?.adcode ?? feature.properties?.name}
                  d={d}
                  fill="#f2ede4"
                  stroke="#ded5be"
                  strokeWidth="0.85"
                  className="transition-colors duration-300 hover:fill-[#eae4d8]"
                />
              );
            })}
          </g>

          {/* 层一（底）：马形路线 — 城市连线之后浮现，作为水印
              transform 同步跟随 viewBox 宽度（+50）和投影下沉（+50） */}
          <motion.path
            d={horseRouteD}
            transform="translate(50, 50)"
            stroke="#f3d230"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(243,210,48,0.04)"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 0.25 } : {}}
            transition={{ duration: 1.6, ease: 'easeOut', delay: 1.0 }}
            style={{ pointerEvents: 'none' }}
          />

          {/* 层二：城市间连线 — 已访问优先动 */}
          {segments.map((seg, i) => {
            const fromPt: [number, number] = [seg.from.cx, seg.from.cy];
            const toPt: [number, number] = [seg.to.cx, seg.to.cy];

            const midX = (fromPt[0] + toPt[0]) / 2;
            const midY = (fromPt[1] + toPt[1]) / 2;
            const dx = toPt[0] - fromPt[0];
            const dy = toPt[1] - fromPt[1];
            const offset = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, 20);
            const cpX = midX + (dy > 0 ? -offset : offset) * 0.5;
            const cpY = midY + (dx > 0 ? offset : -offset) * 0.5;

            const d = `M ${fromPt[0]} ${fromPt[1]} Q ${cpX} ${cpY} ${toPt[0]} ${toPt[1]}`;
            // Visited segments draw immediately; planned segments after
            const segDelay = seg.visited ? 0.1 + i * 0.08 : 0.6 + i * 0.04;

            // Direction arrow on visited segments — placed at the true
            // mid-point of the quadratic Bezier (t=0.5), with the chord
            // direction. Skipped on very short segments to avoid colliding
            // with the city dots.
            let arrow: ReactElement | null = null;
            const segLen = Math.hypot(dx, dy);
            if (seg.visited && segLen > 26) {
              const ax = 0.25 * fromPt[0] + 0.5 * cpX + 0.25 * toPt[0];
              const ay = 0.25 * fromPt[1] + 0.5 * cpY + 0.25 * toPt[1];
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const s = 3.2;
              arrow = (
                <motion.path
                  key={`arrow-${i}`}
                  d={`M ${-s} ${-s * 0.75} L ${s * 0.85} 0 L ${-s} ${s * 0.75} Z`}
                  transform={`translate(${ax} ${ay}) rotate(${angle})`}
                  fill="#1f2937"
                  stroke="#ece8df"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: segDelay + 0.45, ease: 'easeOut' }}
                />
              );
            }

            return (
              <Fragment key={`seg-${i}`}>
                <motion.path
                  d={d}
                  stroke={seg.visited ? '#f3d230' : '#b8a87f'}
                  strokeWidth={seg.visited ? 3.0 : 1.4}
                  strokeLinecap="round"
                  strokeDasharray={seg.visited ? 'none' : '4 5'}
                  fill="none"
                  opacity={seg.visited ? 1 : 0.45}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: seg.visited ? 1 : 0.45 } : {}}
                  transition={{
                    pathLength: { duration: seg.visited ? 0.5 : 0.4, ease: 'easeOut', delay: segDelay },
                    opacity: { duration: 0.2, delay: segDelay },
                  }}
                />
                {arrow}
              </Fragment>
            );
          })}

          {/* 城市节点 + 标签 */}
          {projected.map((city) => {
            const { cx, cy, isLatest, fontSize: labelFontSize } = city;
            const delay = cityDelay(city.order, city.visited);
            const isSelected = selectedKey === city.label;
            // Current location is rendered as a target/pin: a slightly larger
            // gold disc with a small dark inner core, keeping the warm palette
            // intact while standing out from the cluster of visited dots.
            const r = isLatest ? 6.0 : city.isOrigin ? 5.5 : city.visited ? 4.5 : 3.5;
            // Labels render only when placement found a non-colliding spot.
            // Planned non-anchors stay dot-only and expose their name via tooltip.
            const placement = labelPositions.get(city.label);
            const showLabel = city.showLabel && placement != null;
            const [labelDx, labelDy] = placement ?? [0, 0];

            return (
              <g key={city.label}>
                {/* 当前所在城市的呼吸圈 */}
                {isLatest && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="#f3d230"
                    opacity={0}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: [0, 0.4, 0], scale: [1, 1.7, 1] } : {}}
                    transition={{
                      duration: 2.2,
                      delay: delay + 0.5,
                      repeat: Infinity,
                      repeatDelay: 0.4,
                    }}
                    style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: 'none' }}
                  />
                )}

                {/* 选中外圈（点击反馈）— 仅当用户主动选中"非当前所在"的城市时显示，
                    避免和 latest 的呼吸圈/pin 视觉叠加 */}
                {isSelected && !isLatest && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="none"
                    stroke="#3a3328"
                    strokeWidth="1.5"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 0.85, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", damping: 18, stiffness: 260 }}
                    style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: 'none' }}
                  />
                )}

                {/* 出发点外圈 */}
                {city.isOrigin && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={13}
                    fill="none"
                    stroke="#f3d230"
                    strokeWidth="1.8"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isInView ? { opacity: 0.55, scale: 1 } : {}}
                    transition={{ type: "spring", damping: 15, delay }}
                    style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: 'none' }}
                  />
                )}

                {/* 城市圆点 */}
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={city.visited ? '#f3d230' : 'white'}
                  stroke={city.visited ? 'white' : '#9c8c66'}
                  strokeWidth={city.visited ? 1.8 : 1.2}
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : { scale: 0 }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 220,
                    delay,
                  }}
                  whileHover={{ scale: 1.35 }}
                  style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: 'none' }}
                />

                {/* 当前位置内核 — 靶心 pin，金色外圈 + 深棕内点 */}
                {isLatest && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={2.2}
                    fill="#3a2f0e"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : { scale: 0 }}
                    transition={{
                      type: "spring",
                      damping: 14,
                      stiffness: 260,
                      delay: delay + 0.12,
                    }}
                    style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: 'none' }}
                  />
                )}

                {/* 城市名称 — 白色描边防糊 */}
                {showLabel && (
                  <motion.text
                    x={cx + labelDx}
                    y={cy + labelDy}
                    fill={isLatest ? '#1a1408' : city.visited ? '#3a3328' : '#6b6149'}
                    fontSize={labelFontSize}
                    fontWeight={isLatest ? 700 : city.visited ? 600 : 400}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.3, delay: delay + 0.15 }}
                    style={{
                      paintOrder: 'stroke',
                      stroke: '#f2ede4',
                      strokeWidth: 3.5,
                      strokeLinejoin: 'round',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {city.label}
                  </motion.text>
                )}

                {/* 出发标签 */}
                {city.isOrigin && (
                  <motion.text
                    x={cx + labelDx}
                    y={cy + labelDy + 14}
                    fill="#9b7f10"
                    fontSize="9"
                    fontWeight={700}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.3, delay: delay + 0.3 }}
                    style={{
                      paintOrder: 'stroke',
                      stroke: '#f2ede4',
                      strokeWidth: 3,
                      strokeLinejoin: 'round',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {t['map.origin']}
                  </motion.text>
                )}

                {/* 扩大命中区：所有城市都有 tooltip；visited 可点击切换面板 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={city.visited ? 18 : 12}
                  fill="transparent"
                  className={city.visited ? 'cursor-pointer' : 'cursor-help'}
                  onClick={city.visited ? () => onSelect(city.label) : undefined}
                >
                  <title>{`${city.label}${city.event?.date ? ` · ${city.event.date}` : ''}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs text-neutral-600 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-white/40">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" />
          {t['map.visited']}
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-400" />
          {t['map.planned']}
        </span>
      </div>

      {/* 马年标注 */}
      <div className="absolute top-4 right-4 bg-white/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-neutral-500 font-medium select-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-white/40">
        {t['map.horseYear']}
      </div>

      {/* 提示：点击查看 */}
      <div className="absolute top-4 left-4 bg-neutral-900/90 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl text-xs font-semibold select-none flex items-center gap-1.5 shadow-lg border border-white/10">
        <MapPin className="w-3.5 h-3.5 text-brand animate-bounce" />
        {t['journal.tapHint']}
      </div>
    </div>
  );
}

// 行程手账 — 显示选中城市的事件
function JournalPanel({
  city,
  totalLegs,
  isLatest,
  t,
  locale = 'zh',
  hero = false,
}: {
  city: RouteCity | null;
  totalLegs: number;
  isLatest: boolean;
  t: Record<string, string>;
  locale?: Locale;
  hero?: boolean;
}) {
  if (!city) {
    return (
      <AntigravityCard className={`flex flex-col items-center justify-center text-center px-6 py-12 ${hero ? 'min-h-[200px]' : 'min-h-[320px] h-full'}`}>
        <MapPin className="w-6 h-6 text-neutral-300 mb-3" />
        <p className="text-sm text-neutral-500 max-w-[36ch] leading-relaxed">
          {t['journal.empty']}
        </p>
      </AntigravityCard>
    );
  }

  const legCounter = city.isOrigin
    ? null
    : t['journal.legCounter']
        .replace('{n}', String(city.order))
        .replace('{total}', String(totalLegs));

  return (
    <AnimatePresence mode="wait">
      <div key={city.label} className="w-full">
        <AntigravityCard className={`w-full ${hero ? 'p-6 md:p-8' : 'p-6 md:p-7'}`}>
          <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full bg-transparent flex flex-col ${
              hero
                ? 'md:flex-row md:gap-10 md:items-start'
                : 'h-full min-h-[320px]'
            }`}
          >
        {/* 顶部：进程标签 + 城市名 */}
        <header className={hero ? 'md:w-[34%] md:flex-shrink-0 mb-5 md:mb-0' : 'mb-5'}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {legCounter && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-[0.18em] text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-sm">
                {legCounter}
              </span>
            )}
            {isLatest && !city.isOrigin && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-brand-foreground bg-brand px-2 py-0.5 rounded-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-foreground animate-pulse" />
                {t['journal.latest']}
              </span>
            )}
            {city.isOrigin && (
              <span className="inline-flex items-center text-[10px] uppercase tracking-[0.18em] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-sm font-semibold">
                {t['journal.origin']}
              </span>
            )}
          </div>
          <h3 className={`font-bold text-neutral-900 leading-tight ${hero ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'}`}>
            {city.label}
          </h3>
          {city.event?.date && (
            <p className="mt-2 font-mono text-xs text-neutral-500 tracking-wider">
              {city.event.date}
            </p>
          )}
        </header>

        {/* 内容区 */}
        <div className={hero ? 'flex-1 flex flex-col' : 'flex-1 flex flex-col'}>
          {city.event ? (
            <>
              <div className="flex-1">
                <p className={`text-neutral-700 leading-relaxed ${hero ? 'text-base md:text-lg' : 'text-[15px]'}`}>
                  {city.event.summary}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 items-center">
                {city.event.localSlug && (
                  <a
                    href={localePath('/documentation/' + city.event.localSlug, locale)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand text-brand-foreground hover:bg-brand-hover px-5 py-2.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <span>{t['journal.readLocal'] || '阅读深度纪实'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
                {city.event.link && (
                  <a
                    href={city.event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium border-b pb-0.5 hover:text-brand hover:border-brand transition-colors duration-200 cursor-pointer ${
                      city.event.localSlug ? 'text-neutral-500 hover:text-neutral-900 border-neutral-300' : 'text-neutral-900 border-neutral-900'
                    }`}
                  >
                    {city.event.linkLabel ?? city.event.link}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              <span className="inline-flex w-fit items-center text-[10px] uppercase tracking-[0.18em] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-sm font-semibold">
                {t['journal.upcoming']}
              </span>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {t['journal.upcomingDesc']}
              </p>
            </div>
          )}
        </div>
      </motion.article>
    </AntigravityCard>
   </div>
  </AnimatePresence>
  );
}

export default function HomeContent({ heroImages, timeline, locale = 'zh', t }: Props) {
  const [comingSoonTip, setComingSoonTip] = useState(false);

  // Localized cities for current locale
  const localizedCities = useMemo(
    () => routeCities.map(c => localizeCity(c, locale)),
    [locale],
  );
  const sortedCities = useMemo(
    () => [...localizedCities].sort((a, b) => a.order - b.order),
    [localizedCities],
  );
  const lastVisited = useMemo(
    () => [...sortedCities].reverse().find(c => c.visited) ?? null,
    [sortedCities],
  );

  // Selected city for journal panel — defaults to most recent visited
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(
    lastVisited?.label ?? null,
  );
  const selectedCity = useMemo(
    () => localizedCities.find(c => c.label === selectedCityKey) ?? null,
    [localizedCities, selectedCityKey],
  );

  // Journal panel ref — scroll into view on mobile when a city is tapped
  const journalRef = useRef<HTMLDivElement>(null);
  const handleCitySelect = useCallback((key: string) => {
    setSelectedCityKey(key);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches &&
      journalRef.current
    ) {
      journalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const SliderPrevArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label="上一张"
    >
      <ChevronLeft size={20} />
    </button>
  );

  const SliderNextArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 hover:border-white/50 transition-all duration-200 cursor-pointer"
      aria-label="下一张"
    >
      <ChevronRight size={20} />
    </button>
  );

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    arrows: true,
    pauseOnHover: true,
    prevArrow: <SliderPrevArrow />,
    nextArrow: <SliderNextArrow />,
  };

  const handleComingSoon = useCallback(() => {
    setComingSoonTip(true);
    setTimeout(() => setComingSoonTip(false), 2500);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-screen min-h-[600px] bg-black text-white">
        <Slider {...sliderSettings} className="h-full">
          {heroImages.map((image, index) => (
            <div key={index} className="h-screen min-h-[600px] relative">
              <div
                className="h-screen min-h-[600px] bg-cover bg-center"
                style={{ backgroundImage: `url(${image.image})` }}
              >
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </div>
          ))}
        </Slider>

        {/* Hero 内容 */}
        <div className="absolute inset-0 flex flex-col justify-center pointer-events-none px-6 md:px-[12%] lg:px-[16%]">
          <motion.div
            className="max-w-2xl"
            variants={stagger(0.2)}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight"
              variants={fadeLeft}
              transition={springTransition}
            >
              <div className="text-white font-bold">{t['hero.title']}</div>
              <div className="text-brand font-bold text-4xl md:text-6xl mt-2">
                {t['hero.slogan']}
              </div>
              <div className="text-base md:text-lg text-neutral-300 mt-3 font-normal">{t['hero.subtitle']}</div>
            </motion.h1>
            <motion.p
              className="text-base md:text-lg text-neutral-300 mb-10 max-w-lg leading-relaxed"
              variants={fadeLeft}
              transition={springTransition}
            >
              {t['hero.body']}
            </motion.p>
            <motion.div variants={fadeLeft} transition={springTransition} className="flex flex-wrap gap-4">
              <motion.a
                href={localePath('/guide', locale)}
                className="pointer-events-auto bg-brand text-brand-foreground px-8 py-4 rounded-full flex items-center gap-3 hover:bg-brand-hover transition-colors duration-200 cursor-pointer"
                {...buttonPress}
              >
                <span>{t['hero.joinAction']}</span>
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </motion.a>
              <div className="relative">
                <motion.button
                  onClick={handleComingSoon}
                  className="pointer-events-auto border-2 border-white/60 text-white px-8 py-4 rounded-full flex items-center gap-3 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                  {...buttonPress}
                >
                  <Play className="w-5 h-5" />
                  <span>{t['hero.watchVideo']}</span>
                </motion.button>
                {comingSoonTip && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-3 whitespace-nowrap bg-neutral-900/95 text-white text-sm px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm"
                  >
                    {t['hero.comingSoon']}
                  </motion.div>
                )}
              </div>
              <motion.a
                href={localePath('/about', locale)}
                className="pointer-events-auto border border-white/20 backdrop-blur-md bg-white/10 text-white px-8 py-4 rounded-full flex items-center gap-3 hover:bg-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-[0_4px_30px_rgba(0,0,0,0.1)] group"
                {...buttonPress}
              >
                <span>{t['hero.aboutAction']}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce text-white/60">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>


      {/* Hero → Stats 过渡 */}

      {/* 实时状态条 */}
      <div className="bg-neutral-900 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            {t['status.current'].replace('{city}', lastVisited?.label ?? '')}
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">{t['status.departure']}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">{t['status.route']}</span>
        </div>
      </div>

      {/* 项目核心展示 - 路线规划 */}
      <motion.section
        className="bg-neutral-50 text-black py-20 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        variants={stagger(0.2)}
      >
        <div className="max-w-6xl mx-auto">
          {/* 标题 + 统计数据 — 移动端在地图上方 */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-8 md:mb-0">
            <motion.div variants={fadeUp}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {t['route.title1']}
                <br />
                <span>{t['route.title2']}</span>
              </h2>
              <p className="text-neutral-500 leading-relaxed max-w-xl">
                {t['route.body']}
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-3 gap-8 md:gap-12"
            >
              <CountUp end="21" label={t['route.provinces']} />
              <CountUp end="1.9W" label={t['route.distance']} />
              <CountUp end="200+" label={t['route.days']} />
            </motion.div>
          </div>

          {/* 地图全宽 — 主视觉。容器比例匹配 viewBox 4:3，避免横向留白裁掉地图 */}
          <motion.div
            className="w-full aspect-[4/3] md:aspect-[3/2] lg:aspect-[3/2] mt-10"
            variants={fadeIn}
          >
            <ChinaRouteMap
              cities={localizedCities}
              selectedKey={selectedCityKey}
              onSelect={handleCitySelect}
              t={t}
            />
          </motion.div>

          {/* 行程手账 — hero 卡片紧贴地图下方 */}
          <motion.div
            ref={journalRef}
            className="mt-4 lg:mt-5"
            variants={fadeIn}
          >
            <JournalPanel
              city={selectedCity}
              totalLegs={sortedCities.length - 1}
              isLatest={selectedCity?.label === lastVisited?.label}
              t={t}
              locale={locale}
              hero
            />
          </motion.div>

          {/* 已访问城市快速切换 — 缩略 chip 行 */}
          {sortedCities.filter(c => c.visited).length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-400 mr-1">
                {t['map.visited']}
              </span>
              {sortedCities
                .filter(c => c.visited)
                .map(c => {
                  const active = selectedCityKey === c.label;
                  return (
                    <button
                      key={c.label}
                      onClick={() => handleCitySelect(c.label)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors duration-200 cursor-pointer ${
                        active
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900'
                      }`}
                    >
                      {c.label}
                      {c.event?.date && (
                        <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-neutral-400' : 'text-neutral-400'}`}>
                          {c.event.date.slice(5)}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </motion.section>

      {/* 在路上的人 - 三角色时间轴 */}
      <RoleTimeline
        roles={timeline.roles}
        segments={timeline.segments}
        monthMarkers={timeline.monthMarkers}
        projectStart={timeline.projectStart}
        projectEnd={timeline.projectEnd}
        locale={locale}
        t={t}
      />

      {/* 基地车概况 - 流动的基础设施 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-black">
            {t['lab.title']}
          </h2>
          <p className="text-center text-neutral-500 mb-16 max-w-2xl mx-auto">
            {t['lab.subtitle']}
          </p>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={stagger(0.15)}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
          >
            {/* 边缘算力 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.aiTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.aiDesc']}
                </p>
              </div>
            </motion.div>

            {/* 结构加工 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.fabTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.fabDesc']}
                </p>
              </div>
            </motion.div>

            {/* 实验场景 */}
            <motion.div
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-300 cursor-pointer hover:shadow-md transition-shadow duration-200"
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={springTransition}
            >
              <div
                className="h-64 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80)`,
                }}
              ></div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-semibold mb-3 text-black">
                  {t['lab.spaceTitle']}
                </h3>
                <p className="text-neutral-500 mb-4">
                  {t['lab.spaceDesc']}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 完整纪实 CTA */}
      <section className="py-16 px-6 border-t border-neutral-200">
        <motion.div
          className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={stagger(0.15)}
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-2">
              {t['cta.label']}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
              {t['cta.title']}
            </h2>
            <p className="text-neutral-500 text-sm max-w-lg">
              {t['cta.body']}
            </p>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <motion.a
              href={localePath('/documentation', locale)}
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-sm hover:bg-brand hover:text-brand-foreground transition-colors duration-200 cursor-pointer text-sm font-medium whitespace-nowrap"
              {...buttonPress}
            >
              {t['cta.explore']}
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </motion.a>
            <motion.a
              href={localePath('/guide', locale)}
              className="inline-flex items-center gap-2 border border-neutral-300 text-neutral-700 px-6 py-3 rounded-sm hover:border-brand hover:text-brand transition-colors duration-200 cursor-pointer text-sm font-medium whitespace-nowrap"
              {...buttonPress}
            >
              {t['cta.join']}
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </motion.a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
