// Test-time loader. NODE-ONLY — no astro:content import.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseStopBody } from '../../../src/features/route-map/stops-body-parser.mjs';
import type { Stop } from '../../../src/features/route-map/stops-loader';

const STOPS = path.join(process.cwd(), 'src/content/stops');
const PEOPLE = path.join(process.cwd(), 'src/content/people/met');

function split(raw: string) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  return { fm: parseYaml(m[1]) as any, body: m[2] };
}

export async function loadStops(requestedLocale: 'zh' | 'en' = 'zh'): Promise<Stop[]> {
  const files = (await readdir(STOPS)).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'),
  );
  const people = new Map<string, any>();
  for (const pf of (await readdir(PEOPLE)).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('.en.md'),
  )) {
    const { fm, body } = split(await readFile(path.join(PEOPLE, pf), 'utf8'));
    // mirror the real loader: read the en bio sibling too (Codex plan-review should-fix)
    let bioEn: string | undefined;
    try {
      bioEn =
        (await readFile(path.join(PEOPLE, pf.replace(/\.md$/, '.en.md')), 'utf8')).trim() ||
        undefined;
    } catch {
      /* none */
    }
    people.set(fm.id, { fm, bio: body.trim() || undefined, bioEn });
  }
  const stops: Stop[] = [];
  for (const file of files) {
    const { fm, body } = split(await readFile(path.join(STOPS, file), 'utf8'));
    let bodyLocale: 'zh' | 'en' = 'zh';
    let md = body;
    if (requestedLocale === 'en') {
      const enFile = file.replace(/\.md$/, '.en.md');
      try {
        md = await readFile(path.join(STOPS, enFile), 'utf8');
        bodyLocale = 'en';
      } catch {
        /* fallback zh */
      }
    }
    const parts = parseStopBody(md, bodyLocale);
    let event: { date: string; summary: string; link?: string; linkLabel?: string } | undefined;
    if (fm.event) {
      let linkLabel = parts.event?.linkLabel;
      if (!linkLabel && requestedLocale === 'en' && fm.event.link) linkLabel = 'Read field log';
      event = {
        date: fm.event.date,
        summary: parts.event?.summary ?? '',
        link: fm.event.link,
        linkLabel,
      };
    }
    stops.push({
      id: fm.id,
      order: fm.order,
      visited: fm.visited,
      isOrigin: fm.isOrigin,
      anchor: fm.anchor,
      label: requestedLocale === 'en' && fm.label_en ? fm.label_en : fm.label,
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
      people: fm.people
        ?.map((id: string) => {
          const p = people.get(id);
          if (!p) return null;
          return {
            id,
            name: requestedLocale === 'en' && p.fm.name_en ? p.fm.name_en : p.fm.name,
            role: requestedLocale === 'en' && p.fm.role_en ? p.fm.role_en : p.fm.role,
            image: p.fm.image,
            bio: requestedLocale === 'en' && p.bioEn ? p.bioEn : p.bio,
          };
        })
        .filter(Boolean),
      photos: parts.photos?.map((p: any) => ({ src: p.src, alt: p.caption, caption: p.caption })),
    } as Stop);
  }
  return stops.sort((a, b) => a.order - b.order);
}
