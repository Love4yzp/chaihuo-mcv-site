import type { Stop, StopEvent } from './stops-loader';

export type RouteCity = Stop;
export type RouteCityEvent = StopEvent;

export type ProjectedCity = RouteCity & {
  cx: number;
  cy: number;
  elevationOffset: number;
  isLatest: boolean;
  showLabel: boolean;
  fontSize: number;
};

export type Rect = readonly [number, number, number, number]; // [x0, y0, x1, y1]

export function isRouteOnlyCity(city: Pick<RouteCity, 'id' | 'routeOnly'>): boolean {
  return city.routeOnly === true || city.id.endsWith('-return');
}
