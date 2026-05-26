import { useMemo } from "react";
import type { RouteCity } from "@/data/route-cities";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  geoData,
  pathGenerator,
  projectCities,
} from "./projection";

interface Props {
  cities: RouteCity[];
  ariaLabel?: string;
}

const round = (n: number) => Math.round(n * 10) / 10;

function cityPoint(city: { cx: number; cy: number; cz: number }) {
  return `${round(city.cx)},${round(city.cy - city.cz)}`;
}

export default function RoutePreview({ cities, ariaLabel }: Props) {
  const projected = useMemo(() => projectCities(cities), [cities]);
  const visited = useMemo(
    () => projected.filter((city) => city.visited).sort((a, b) => a.order - b.order),
    [projected],
  );
  const current = visited.at(-1);
  const origin = visited.find((city) => city.isOrigin);
  const middleAnchor = visited.find(
    (city) => city.anchor && city.label !== origin?.label && city.label !== current?.label,
  );
  const labelCities = [origin, middleAnchor, current].filter(
    (city, index, list): city is NonNullable<typeof city> =>
      !!city && list.findIndex((item) => item?.label === city.label) === index,
  );

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="h-full w-full"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} rx="18" fill="#f7f4ed" />

      <g>
        {geoData.features.map((feature) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          return (
            <path
              key={feature.properties?.adcode ?? feature.properties?.name}
              d={d}
              fill="#f2ede4"
              stroke="#ded5be"
              strokeWidth="0.8"
            />
          );
        })}
      </g>

      {visited.length > 1 && (
        <polyline
          points={visited.map(cityPoint).join(" ")}
          stroke="#f3d230"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}

      {visited.map((city) => {
        const x = round(city.cx);
        const y = round(city.cy - city.cz);
        const isCurrent = city.label === current?.label;
        return (
          <g key={city.label}>
            {city.isOrigin && (
              <>
                <circle cx={x} cy={y} r="13" fill="none" stroke="#f3d230" strokeWidth="2" />
                <circle cx={x} cy={y} r="8" fill="none" stroke="#3a3328" strokeOpacity="0.35" />
              </>
            )}
            {isCurrent && <circle cx={x} cy={y} r="12" fill="#f3d230" opacity="0.22" />}
            <circle cx={x} cy={y} r={isCurrent ? 6 : 4.8} fill="#f3d230" stroke="#fffaf0" strokeWidth="2" />
          </g>
        );
      })}

      {labelCities.map((city, index) => {
        const x = round(city.cx);
        const y = round(city.cy - city.cz);
        const dx = index === 0 ? 14 : city === current ? 12 : -46;
        const dy = index === 0 ? 18 : city === current ? -12 : 18;
        return (
          <text
            key={`label-${city.label}`}
            x={x + dx}
            y={y + dy}
            fill={city === current ? "#1f1b13" : "#615947"}
            fontSize={city === current ? 15 : 12}
            fontWeight={city === current ? 700 : 600}
            style={{ paintOrder: "stroke", stroke: "#f7f4ed", strokeWidth: 4, strokeLinejoin: "round" }}
          >
            {city.label}
          </text>
        );
      })}
    </svg>
  );
}
