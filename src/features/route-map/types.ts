import type { RouteCity } from "@/data/route-cities";

export type ProjectedCity = RouteCity & {
  cx: number;
  cy: number;
  cz: number;
  isLatest: boolean;
  showLabel: boolean;
  fontSize: number;
};

export type Rect = readonly [number, number, number, number]; // [x0, y0, x1, y1]
