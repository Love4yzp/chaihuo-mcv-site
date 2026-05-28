import { useMemo } from "react";
import { motion } from "motion/react";
import type { RouteCity } from "./types";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  geoData,
  pathGenerator,
  projectCities,
  buildCityLines,
  placeLabels,
} from "./projection";

interface Props {
  cities: RouteCity[];
  ariaLabel?: string;
}

const round = (n: number) => Math.round(n * 10) / 10;

export default function RoutePreview({ cities, ariaLabel }: Props) {
  const projected = useMemo(() => projectCities(cities), [cities]);
  const segments = useMemo(() => buildCityLines(projected), [projected]);

  // Find current city (last visited)
  const current = useMemo(
    () => [...projected].reverse().find((city) => city.visited),
    [projected]
  );

  // Auto-calculated label offsets to prevent collision
  const labelOffsets = useMemo(() => placeLabels(projected), [projected]);

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="h-full w-full"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="vehicleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eab308" stopOpacity={0.65} />
          <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
        </radialGradient>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={MAP_WIDTH} height={MAP_HEIGHT} rx="18" fill="#ebdcb9" />

      {/* 📡 Background Holographic Coordinate Grid Mesh */}
      <g opacity="0.06" stroke="#a16207" strokeWidth="0.5">
        <line x1={0} y1={100} x2={MAP_WIDTH} y2={100} />
        <line x1={0} y1={200} x2={MAP_WIDTH} y2={200} />
        <line x1={0} y1={300} x2={MAP_WIDTH} y2={300} />
        <line x1={0} y1={400} x2={MAP_WIDTH} y2={400} />
        <line x1={0} y1={500} x2={MAP_WIDTH} y2={500} />

        <line x1={150} y1={0} x2={150} y2={MAP_HEIGHT} />
        <line x1={300} y1={0} x2={300} y2={MAP_HEIGHT} />
        <line x1={450} y1={0} x2={450} y2={MAP_HEIGHT} />
        <line x1={600} y1={0} x2={600} y2={MAP_HEIGHT} />
        <line x1={750} y1={0} x2={750} y2={MAP_HEIGHT} />
      </g>

      {/* 📡 Concentric Radar Rings centered around Shenzhen start point */}
      <g opacity="0.05" stroke="#a16207" fill="none" strokeWidth="0.5">
        <circle cx={508} cy={453} r={70} />
        <circle cx={508} cy={453} r={170} strokeDasharray="3 4" />
        <circle cx={508} cy={453} r={270} />
      </g>

      {/* 🇨🇳 Background map outlines (High-Contrast Floating Silhouette) */}
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
              className="transition-colors duration-300"
            />
          );
        })}
      </g>

      {/* 🛣️ Route Lines (Solid for visited, Dashed for planned future) */}
      {segments.map((seg, i) => {
        const fromX = round(seg.from.cx);
        const fromY = round(seg.from.cy);
        const toX = round(seg.to.cx);
        const toY = round(seg.to.cy);

        return (
          <g key={`seg-group-${i}`}>
            {/* Pulsing glow background for active route segments */}
            {seg.visited && (
              <path
                d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
                stroke="#eab308"
                strokeWidth={5}
                strokeLinecap="round"
                fill="none"
                opacity={0.15}
                style={{ filter: 'url(#neon-glow)', pointerEvents: 'none' }}
              />
            )}

            <motion.line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke={seg.visited ? "#f3d230" : "#b8a87f"}
              strokeWidth={seg.visited ? "3.2" : "1.2"}
              strokeDasharray={seg.visited ? "none" : "3 4"}
              strokeLinecap="round"
              opacity={seg.visited ? 1 : 0.45}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 1.2, delay: i * 0.06, ease: "easeOut" }}
            />

            {/* Flowing electric charge pulse overlays for visited segments */}
            {seg.visited && (
              <motion.line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray="6 30"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -36 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                opacity={0.8}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      })}

      {/* 🔴 City Dots (Glowing for current, subtle for future) */}
      {projected.map((city) => {
        const x = round(city.cx);
        const y = round(city.cy);
        const isCurrent = current && city.label === current.label;

        return (
          <g key={city.label} opacity={city.visited ? 1 : 0.5}>
            {city.isOrigin && (
              <>
                <circle cx={x} cy={y} r="12" fill="none" stroke="#f3d230" strokeWidth="2" />
                <circle cx={x} cy={y} r="7" fill="none" stroke="#3a3328" strokeOpacity="0.25" />
              </>
            )}
            {isCurrent && (
              <motion.circle
                cx={x}
                cy={y}
                fill="#f3d230"
                initial={{ r: 6, opacity: 0.5 }}
                animate={{ r: [6, 14], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity, repeatDelay: 0.4 }}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? 5.5 : 4}
              fill={city.visited ? "#f3d230" : "#c2b8a0"}
              stroke="#fffaf0"
              strokeWidth="1.6"
            />
          </g>
        );
      })}

      {/* 🏷️ Smart Non-overlapping Labels */}
      {projected
        .filter((city) => city.showLabel)
        .map((city) => {
          const offset = labelOffsets.get(city.id);
          if (!offset) return null; // Collided or filtered

          const x = round(city.cx + offset[0]);
          const y = round(city.cy + offset[1]);
          const isCurrent = current && city.label === current.label;

          return (
            <text
              key={`label-${city.label}`}
              data-route-city-label="true"
              data-city-id={city.id}
              x={x}
              y={y}
              fill={isCurrent ? "#1f1b13" : city.visited ? "#534c3c" : "#8c8370"}
              fontSize={isCurrent ? 13 : 10}
              fontWeight={isCurrent ? 700 : 500}
              style={{
                paintOrder: "stroke",
                stroke: "#f7f4ed",
                strokeWidth: 3.5,
                strokeLinejoin: "round",
              }}
            >
              {city.label}
            </text>
          );
        })}
    </svg>
  );
}
