import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/index';
import { routeCities, type RouteCity } from '@/data/route-cities';

export type JournalEntry = CollectionEntry<'journals'>;
export type JournalStatus = JournalEntry['data']['status'];

export interface LocalizedJournal {
  slug: string;
  date: string;
  status: JournalStatus;
  city: string;
  cityLabel: string;
  people: string[];
  title: string;
  excerpt: string;
  coverImage?: string;
  activities: string[];
  equipment: string[];
  yuqueUrl?: string;
  tags: string[];
}

/** All journals, newest first. Drafts excluded by default. */
export async function getAllJournals(
  opts: { includeDrafts?: boolean } = {},
): Promise<JournalEntry[]> {
  const all = await getCollection('journals');
  const filtered = opts.includeDrafts
    ? all
    : all.filter((j) => j.data.status !== 'draft');
  return filtered.sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export function getJournalsByCity(
  journals: JournalEntry[],
  cityId: string,
): JournalEntry[] {
  return journals.filter((j) => j.data.city === cityId);
}

export function countByStatus(
  journals: JournalEntry[],
): Record<JournalStatus, number> {
  const counts: Record<JournalStatus, number> = {
    published: 0,
    placeholder: 0,
    draft: 0,
  };
  for (const j of journals) counts[j.data.status]++;
  return counts;
}

/** Resolve a stable city id back to its RouteCity (or undefined). */
export function findCity(cityId: string): RouteCity | undefined {
  return routeCities.find((c) => c.id === cityId);
}

/** Apply locale-aware field selection to a journal for rendering. */
export function localizeJournal(
  entry: JournalEntry,
  locale: Locale,
): LocalizedJournal {
  const d = entry.data;
  const city = findCity(d.city);
  const cityLabel = city
    ? locale === 'en' && city.label_en ? city.label_en : city.label
    : d.city;
  const activities =
    locale === 'en' && d.activities_en.length > 0 ? d.activities_en : d.activities;
  return {
    slug: entry.id,
    date: d.date,
    status: d.status,
    city: d.city,
    cityLabel,
    people: d.people,
    title: locale === 'en' && d.title_en ? d.title_en : d.title,
    excerpt: locale === 'en' && d.excerpt_en ? d.excerpt_en : d.excerpt,
    coverImage: d.coverImage,
    activities,
    equipment: d.equipment,
    yuqueUrl: d.yuqueUrl,
    tags: d.tags,
  };
}
