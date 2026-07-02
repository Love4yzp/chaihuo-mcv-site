import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/index';
// The parser is a pure .mjs file with full JSDoc @returns {BodyParts} types;
// TypeScript resolves them via allowJs — no @ts-expect-error needed.
import { parseStopBody } from './stops-body-parser.mjs';
import type { StopRelationType, StopThemeType } from './stops-schema';

export type ResolvedPerson = {
  id: string;
  name: string;
  role?: string;
  image?: string;
  bio?: string;
};

export type StopEvent = {
  date: string;
  summary: string;
  link?: string;
  linkLabel?: string;
};

// Consumer-facing, already-localized shape. Field-compatible with Phase 4's Stop.
export type Stop = {
  id: string;
  order: number;
  visited: boolean;
  isOrigin?: boolean;
  anchor?: boolean;
  routeOnly?: boolean;
  label: string;
  province?: string;
  lng: number;
  lat: number;
  altitude: string;
  relationType: StopRelationType;
  themes: StopThemeType[];
  terrain: string;
  terrainStep: string;
  climate: string;
  challenge: string;
  relationStats: string[];
  event?: StopEvent;
  expedition?: { world: string; fire: string; frontier: string };
  people?: ResolvedPerson[];
  // alt = caption (set during assembly) so PhotoStrip's `alt ?? caption` keeps working
  photos?: { src: string; alt?: string; caption: string }[];
};

const READ_FIELD_LOG_EN = 'Read field log'; // mirrors t['route.action.readFieldLog'] (i18n/route.ts)

function pickName(fm: { name: string; name_en?: string }, requested: Locale): string {
  return requested === 'en' && fm.name_en ? fm.name_en : fm.name;
}
function pickRole(fm: { role?: string; role_en?: string }, requested: Locale): string | undefined {
  return requested === 'en' && fm.role_en ? fm.role_en : fm.role;
}

export async function loadLocalizedStops(requestedLocale: Locale): Promise<Stop[]> {
  const stopEntries = await getCollection('stops');
  const peopleEntries = await getCollection('people-met');

  // Raw bodies for *.en.md siblings (excluded from collections) via import.meta.glob.
  const enStopBodies = import.meta.glob('/src/content/stops/*.en.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const enPersonBodies = import.meta.glob('/src/content/people/met/*.en.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const stripFrontmatter = (raw: string) => raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  const personById = new Map(peopleEntries.map((p) => [p.data.id, p]));

  const resolvePerson = (id: string): ResolvedPerson | null => {
    const entry = personById.get(id);
    if (!entry) return null;
    const fm = entry.data;
    let bio = (entry.body ?? '').trim() || undefined;
    if (requestedLocale === 'en') {
      const enPath = `/src/content/people/met/${id}.en.md`;
      const enRaw = enPersonBodies[enPath];
      if (enRaw) bio = stripFrontmatter(enRaw).trim() || bio;
    }
    return {
      id: fm.id,
      name: pickName(fm, requestedLocale),
      role: pickRole(fm, requestedLocale),
      image: fm.image,
      bio,
    };
  };

  const stops = stopEntries.map((entry) => {
    const fm = entry.data;

    // Decide bodyLocale + bodyMarkdown
    let bodyLocale: Locale = 'zh';
    let bodyMarkdown = entry.body ?? '';
    if (requestedLocale === 'en') {
      const enPath = `/src/content/stops/${String(fm.order).padStart(2, '0')}-${fm.id}.en.md`;
      const enRaw = enStopBodies[enPath];
      if (enRaw) {
        bodyLocale = 'en';
        bodyMarkdown = stripFrontmatter(enRaw);
      }
    }

    const parts = parseStopBody(bodyMarkdown, bodyLocale);

    let event: StopEvent | undefined;
    if (fm.event) {
      let linkLabel = parts.event?.linkLabel;
      if (!linkLabel && requestedLocale === 'en' && fm.event.link) linkLabel = READ_FIELD_LOG_EN;
      event = {
        date: fm.event.date,
        summary: parts.event?.summary ?? '',
        link: fm.event.link,
        linkLabel,
      };
    }

    const photos = parts.photos?.map((p: { src: string; caption: string }) => ({
      src: p.src,
      alt: p.caption,
      caption: p.caption,
    }));
    const people = fm.people?.map(resolvePerson).filter((p): p is ResolvedPerson => p !== null);

    const stop: Stop = {
      id: fm.id,
      order: fm.order,
      visited: fm.visited,
      isOrigin: fm.isOrigin,
      anchor: fm.anchor,
      routeOnly: fm.routeOnly,
      label: requestedLocale === 'en' && fm.label_en ? fm.label_en : fm.label,
      province: fm.province,
      lng: fm.lng,
      lat: fm.lat,
      altitude: fm.altitude,
      relationType: fm.relationType,
      themes: fm.themes,
      terrain: parts.terrain,
      terrainStep: parts.terrainStep,
      climate: parts.climate,
      challenge: parts.challenge,
      relationStats: parts.relationStats,
      event,
      expedition: parts.expedition,
      people,
      photos,
    };
    return stop;
  });

  return stops.sort((a, b) => a.order - b.order);
}
