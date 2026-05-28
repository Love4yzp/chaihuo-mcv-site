import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { routeCities } from './data/route-cities';
import { stopSchema } from './features/route-map/stops-schema';

const cityIds = new Set(routeCities.map((c) => c.id));

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    date: z.string(),
    description: z.string(),
    description_en: z.string().optional(),
    image: z.url(),
    tags: z.array(z.string()),
    yuqueUrl: z.url().optional(),
  }),
});

// 旅途日记 — primary travel content. Linked to cities/people by stable id,
// not by Chinese display name, so renames don't break references.
const journals = defineCollection({
  loader: glob({ base: './src/content/journals', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    date: z.string(),
    // Editorial state. Explicit field — never inferred from body length.
    //  - published:   live entry with real content
    //  - placeholder: stop is on the map but the write-up isn't ready
    //  - draft:       work in progress, hidden from public listings
    status: z.enum(['published', 'placeholder', 'draft']),
    // Stable city id (e.g. 'guiyang') — must match a RouteCity.id in
    // src/data/route-cities.ts. Build fails on typos/unknown ids.
    city: z.string().refine((id) => cityIds.has(id), {
      message: `Unknown city id. Must be one of: ${[...cityIds].join(', ')}`,
    }),
    // Stable people ids (e.g. ['he-laoshi']). Names live in src/data/team.json.
    people: z.array(z.string()).default([]),
    excerpt: z.string(),
    excerpt_en: z.string().optional(),
    coverImage: z.string().optional(),
    activities: z.array(z.string()).default([]),
    activities_en: z.array(z.string()).default([]),
    // Equipment ids referenced in this entry (match equipment.json item ids).
    equipment: z.array(z.string()).default([]),
    yuqueUrl: z.url().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const equipment = defineCollection({
  loader: file('./src/data/equipment.json'),
  schema: z.object({
    id: z.string(),
    icon: z.string(),
    title: z.string(),
    title_en: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      name_en: z.string().optional(),
      spec: z.string(),
      spec_en: z.string().optional(),
    })),
  }),
});

const team = defineCollection({
  loader: file('./src/data/team.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    role: z.string(),
    role_en: z.string().optional(),
    image: z.string(),
    bio: z.string().optional(),
    bio_en: z.string().optional(),
  }),
});

const faq = defineCollection({
  loader: file('./src/data/faq.json'),
  schema: z.object({
    id: z.string(),
    label: z.string(),
    label_en: z.string().optional(),
    items: z.array(z.object({
      question: z.string(),
      question_en: z.string().optional(),
      answer: z.string(),
      answer_en: z.string().optional(),
    })),
  }),
});

const partners = defineCollection({
  loader: file('./src/data/partners.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    description_en: z.string().optional(),
  }),
});

const heroes = defineCollection({
  loader: file('./src/data/heroes.json'),
  schema: z.object({
    id: z.string(),
    image: z.string(),
    alt: z.string().optional(),
    alt_en: z.string().optional(),
  }),
});

const stops = defineCollection({
  loader: glob({
    base: './src/content/stops',
    // exclude underscore-prefixed files like _template.md
    pattern: '!(_*).md',
  }),
  schema: stopSchema,
});

export const collections = { notes, journals, equipment, team, faq, partners, heroes, stops };
