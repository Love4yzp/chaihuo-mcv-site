import { Fragment, useState, useEffect, useMemo, useRef, type ReactElement } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { MapPin } from "lucide-react";
import gsap from "gsap";
import type { RouteCity } from "@/data/route-cities";
import type { ProjectedCity } from "./types";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  geoData,
  pathGenerator,
  projectCities,
  placeLabels,
  buildCityLines,
  horseRouteD
} from "./projection";

export default function ChinaRouteMap({
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

  const [hoveredCity, setHoveredCity] = useState<ProjectedCity | null>(null);

  const projected = useMemo(() => projectCities(cities), [cities]);
  const labelPositions = useMemo(() => placeLabels(projected), [projected]);
  const segments = useMemo(() => buildCityLines(projected), [projected]);

  // ─── 普罗米修斯号车载指针滑行与切向转向 (Skeleton & Muscles: Vehicle Dynamic Path Tracker) ───
  const [vehiclePos, setVehiclePos] = useState<[number, number] | null>(null);
  const [vehicleAngle, setVehicleAngle] = useState(0);
  const vehicleTweenRef = useRef<gsap.core.Tween | null>(null);
  const prevOrderRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedKey) {
      setVehiclePos(null);
      return;
    }

    const activeCity = projected.find(c => c.label === selectedKey);
    if (!activeCity) {
      setVehiclePos(null);
      return;
    }

    const currentOrder = activeCity.order;
    const prevOrder = prevOrderRef.current;
    prevOrderRef.current = currentOrder;

    const targetPt: [number, number] = [activeCity.cx, activeCity.cy];

    if (prevOrder === null || prevOrder === currentOrder) {
      setVehiclePos(targetPt);
      setVehicleAngle(0);
      return;
    }

    const prevCity = projected.find(c => c.order === prevOrder);
    if (!prevCity) {
      setVehiclePos(targetPt);
      setVehicleAngle(0);
      return;
    }

    const fromPt: [number, number] = [prevCity.cx, prevCity.cy];

    const midX = (fromPt[0] + targetPt[0]) / 2;
    const midY = (fromPt[1] + targetPt[1]) / 2;
    const dx = targetPt[0] - fromPt[0];
    const dy = targetPt[1] - fromPt[1];
    const offset = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, 20);
    const side = currentOrder > prevOrder ? 1 : -1;
    const cpX = midX + (dy > 0 ? -offset : offset) * 0.5 * side;
    const cpY = midY + (dx > 0 ? offset : -offset) * 0.5 * side;

    const animObj = { t: 0 };
    if (vehicleTweenRef.current) vehicleTweenRef.current.kill();

    vehicleTweenRef.current = gsap.to(animObj, {
      t: 1,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => {
        const tVal = animObj.t;
        const mt = 1 - tVal;
        // Compute quadratic Bezier curve coordinates in 3D Z-altitude space
        const vx = mt * mt * fromPt[0] + 2 * mt * tVal * cpX + tVal * tVal * targetPt[0];
        const vy = mt * mt * fromPt[1] + 2 * mt * tVal * cpY + tVal * tVal * targetPt[1];
        setVehiclePos([vx, vy]);

        // Compute Bezier derivative for dynamic vehicle tangent rotation angle
        const tangentX = 2 * mt * (cpX - fromPt[0]) + 2 * tVal * (targetPt[0] - cpX);
        const tangentY = 2 * mt * (cpY - fromPt[1]) + 2 * tVal * (targetPt[1] - cpY);
        const angle = Math.atan2(tangentY, tangentX) * (180 / Math.PI);
        setVehicleAngle(angle);
      }
    });

    return () => {
      if (vehicleTweenRef.current) vehicleTweenRef.current.kill();
    };
  }, [selectedKey, projected]);

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
      className="relative w-full h-full bg-[#ebdcb9] border border-neutral-300/40 overflow-hidden rounded-2xl shadow-[inset_0_4px_30px_rgba(0,0,0,0.01),0_15px_40px_rgba(0,0,0,0.03)] p-6 transition-all duration-300"
    >
      {/* Background Holographic Tech Grid Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] transition-opacity duration-500"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.35) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Dynamic Hover Glow Backlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 select-none"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 380px at ${glarePos.x}px ${glarePos.y}px, rgba(243,210,48,0.08) 0%, transparent 80%)`,
        }}
      />

      {/* Interactive 3D Sandbox Map Board */}
      <motion.div
        className="w-full h-full relative"
        style={{
          transform: `perspective(1200px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: rotate.x,
          rotateY: rotate.y,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full drop-shadow-[0_12px_35px_rgba(0,0,0,0.04)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="vehicleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.65} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
            </radialGradient>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tactical Holographic Grid Mesh & Radar Sweep */}
          <g opacity="0.06">
            <line x1={0} y1={100} x2={MAP_WIDTH} y2={100} stroke="#a16207" strokeWidth="0.5" />
            <line x1={0} y1={200} x2={MAP_WIDTH} y2={200} stroke="#a16207" strokeWidth="0.5" />
            <line x1={0} y1={300} x2={MAP_WIDTH} y2={300} stroke="#a16207" strokeWidth="0.5" />
            <line x1={0} y1={400} x2={MAP_WIDTH} y2={400} stroke="#a16207" strokeWidth="0.5" />
            <line x1={0} y1={500} x2={MAP_WIDTH} y2={500} stroke="#a16207" strokeWidth="0.5" />

            <line x1={150} y1={0} x2={150} y2={MAP_HEIGHT} stroke="#a16207" strokeWidth="0.5" />
            <line x1={300} y1={0} x2={300} y2={MAP_HEIGHT} stroke="#a16207" strokeWidth="0.5" />
            <line x1={450} y1={0} x2={450} y2={MAP_HEIGHT} stroke="#a16207" strokeWidth="0.5" />
            <line x1={600} y1={0} x2={600} y2={MAP_HEIGHT} stroke="#a16207" strokeWidth="0.5" />
            <line x1={750} y1={0} x2={750} y2={MAP_HEIGHT} stroke="#a16207" strokeWidth="0.5" />
          </g>
          <g opacity="0.04" stroke="#a16207" fill="none" strokeWidth="0.5">
            <circle cx={508} cy={453} r={60} />
            <circle cx={508} cy={453} r={140} strokeDasharray="3 4" />
            <circle cx={508} cy={453} r={240} />
          </g>

          {/* 省份轮廓 (High-Contrast Floating Silhouette) */}
          <g>
            {geoData.features.map((feature) => {
              const d = pathGenerator(feature);
              if (!d) return null;
              const provinceName = feature.properties?.name || '';
              const isVisited = ['广东', '广西', '贵州', '四川'].some(p => provinceName.includes(p));
              return (
                <path
                  key={feature.properties?.adcode ?? feature.properties?.name}
                  d={d}
                  fill={isVisited ? "#fdf6d2" : "#ffffff"}
                  stroke={isVisited ? "#d4b423" : "#e3ded0"}
                  strokeWidth={isVisited ? "1.2" : "0.75"}
                  className="transition-colors duration-300 hover:fill-[#f8f6ee]"
                />
              );
            })}
          </g>

          {/* 层一（底）：马形路线 — 城市连线之后浮现，作为水印 */}
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

            // 镜像对称性
            const side = seg.to.order > seg.from.order ? 1 : -1;
            const cpX = midX + (dy > 0 ? -offset : offset) * 0.5 * side;
            const cpY = midY + (dx > 0 ? offset : -offset) * 0.5 * side;

            const d = `M ${fromPt[0]} ${fromPt[1]} Q ${cpX} ${cpY} ${toPt[0]} ${toPt[1]}`;
            // Visited segments draw immediately; planned segments after
            const segDelay = seg.visited ? 0.1 + i * 0.08 : 0.6 + i * 0.04;

            // Direction arrow on visited segments
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
                  fill="#a16207"
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
                {/* 皮肤层：半透明黄色霓虹微光轨迹背景 */}
                {seg.visited && (
                  <path
                    d={d}
                    stroke="#eab308"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.16}
                    style={{ filter: 'url(#neon-glow)', pointerEvents: 'none' }}
                  />
                )}

                {/* 轨迹核心主线 */}
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

                {/* 骨架与肌肉层：已访问路线的流动电荷脉冲 */}
                {seg.visited && (
                  <motion.path
                    d={d}
                    stroke="#ffffff"
                    strokeWidth={2.0}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.8}
                    strokeDasharray="8 36"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -44 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {arrow}
              </Fragment>
            );
          })}

          {/* 城市节点 + 标签 */}
          {projected.map((city) => {
            const { cx, cy, isLatest, fontSize: labelFontSize } = city;
            const delay = cityDelay(city.order, city.visited);
            const isSelected = selectedKey === city.label;
            const r = isLatest ? 6.0 : city.isOrigin ? 5.5 : city.visited ? 4.5 : 3.5;
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

                {/* 选中外圈 */}
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

                {/* 当前位置内核 — 靶心 pin */}
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
                    {t['map.origin'] ?? '出发点'}
                  </motion.text>
                )}

                {/* 精密事件触发区 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={city.visited ? 18 : 12}
                  fill="transparent"
                  className={city.visited ? 'cursor-pointer' : 'cursor-help'}
                  onClick={city.visited ? () => onSelect(city.label) : undefined}
                  onMouseEnter={() => setHoveredCity(city)}
                  onMouseLeave={() => setHoveredCity(null)}
                />
              </g>
            );
          })}

          {/* 5. 普罗米修斯车载标针 (Prometheus Vehicle Indicator) */}
          {vehiclePos && (
            <g transform={`translate(${vehiclePos[0]}, ${vehiclePos[1]}) rotate(${vehicleAngle})`}>
              <circle
                cx={0}
                cy={0}
                r={10}
                fill="url(#vehicleGlow)"
                className="animate-pulse"
              />
              <path
                d="M -4.5 -3.8 L 6 0 L -4.5 3.8 L -1.8 0 Z"
                fill="#eab308"
                stroke="white"
                strokeWidth={1.0}
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 6. 典雅微型悬浮气泡卡 */}
          <AnimatePresence>
            {hoveredCity && (
              <motion.g
                key={hoveredCity.label}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                transform={`translate(${hoveredCity.cx}, ${hoveredCity.cy - 10})`}
                style={{ pointerEvents: 'none' }}
              >
                <rect x={-55} y={-24} width={110} height={18} rx={4} fill="#1a1a1a" stroke="#eab308" strokeWidth={0.6} />
                <path d="M -3 -6 L 0 -3 L 3 -6 Z" fill="#1a1a1a" stroke="#eab308" strokeWidth={0.6} strokeLinecap="round" />
                <path d="M -2.5 -6.1 L 2.5 -6.1" stroke="#1a1a1a" strokeWidth={0.8} />
                <text x={0} y={-15} textAnchor="middle" dominantBaseline="middle" fill="#eab308" fontSize={8.5} fontWeight={700} letterSpacing={0.3}>
                  {hoveredCity.label}
                  {hoveredCity.event?.date && (
                    <tspan fill="#9ca3af" fontWeight={400} fontSize={7.5}>
                      {` · ${hoveredCity.event.date.slice(5)}`}
                    </tspan>
                  )}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </motion.div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white/70 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs text-neutral-600 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white/50 hover:border-yellow-500/20 transition-all duration-300">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" />
          {t['map.visited'] ?? '已抵达'}
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-400" />
          {t['map.planned'] ?? '计划中'}
        </span>
      </div>

      {/* 马年标注 */}
      <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-neutral-500 font-medium select-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white/50">
        {t['map.horseYear'] ?? '2026 · 马年路线'}
      </div>

      {/* 提示：点击查看 */}
      <div className="absolute top-4 left-4 bg-neutral-900/90 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl text-xs font-semibold select-none flex items-center gap-1.5 shadow-lg border border-white/10">
        <MapPin className="w-3.5 h-3.5 text-brand animate-bounce" />
        {t['journal.tapHint'] ?? t['route.journals.tapHint'] ?? '点击城市查看'}
      </div>
    </div>
  );
}
