import type { RouteCity, ThemeType } from '@/data/route-cities';

/** Display order of theme chips. */
export const THEME_ORDER: ThemeType[] = ['science', 'maker', 'industry'];

/** True when a city carries the given activity theme. */
export function cityMatchesTheme(city: Pick<RouteCity, 'themes'>, theme: ThemeType): boolean {
  return city.themes.includes(theme);
}

/** Count how many cities carry each theme. */
export function countThemes(cities: Pick<RouteCity, 'themes'>[]): Record<ThemeType, number> {
  const counts: Record<ThemeType, number> = { science: 0, maker: 0, industry: 0 };
  for (const city of cities) {
    for (const theme of THEME_ORDER) {
      if (cityMatchesTheme(city, theme)) counts[theme] += 1;
    }
  }
  return counts;
}
