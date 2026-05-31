export type Locale = 'zh' | 'en';
export const defaultLocale: Locale = 'zh';
export const locales: Locale[] = ['zh', 'en'];

/** Extract locale from URL path: /en/... → 'en', everything else → 'zh' */
export function getLangFromUrl(url: URL): Locale {
  const firstSegment = url.pathname.split('/')[1];
  return firstSegment === 'en' ? 'en' : 'zh';
}

/** Look up a key from a flat dictionary, falling back to the key itself */
export function t(dict: Record<string, string>, key: string): string {
  return dict[key] ?? key;
}

/**
 * Pick locale-appropriate fields from an object.
 * For locale 'en', reads `field_en` falling back to `field`.
 * For locale 'zh', reads `field` directly.
 */
export function localize<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  locale: Locale,
): T {
  if (locale === 'zh') return obj;
  const result = { ...obj };
  for (const field of fields) {
    const enKey = `${field}_en`;
    if (enKey in obj && obj[enKey] != null && obj[enKey] !== '') {
      (result as Record<string, unknown>)[field] = obj[enKey];
    }
  }
  return result;
}

/** Prefix a path with /en when locale is 'en' */
export function localePath(path: string, locale: Locale): string {
  if (locale === 'zh') return path;
  return `/en${path === '/' ? '' : path}`;
}

/** Get the alternate-locale URL for a given pathname */
export function getAlternateUrl(pathname: string): { locale: Locale; path: string } {
  if (pathname.startsWith('/en')) {
    const zhPath = pathname.replace(/^\/en/, '') || '/';
    return { locale: 'zh', path: zhPath };
  }
  return { locale: 'en', path: `/en${pathname === '/' ? '' : pathname}` };
}
