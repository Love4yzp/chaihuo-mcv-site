import { z } from 'astro/zod';

const relationType = z.enum(['departure', 'education', 'community', 'industry']);
const themeType = z.enum(['science', 'maker', 'industry']);

const personSchema = z.object({
  // REQUIRED stable id, banks future extraction into a people/met/ collection
  id: z.string().regex(/^[a-z0-9-]+$/, 'people[].id must be kebab-case ascii'),
  name: z.string(),
  name_en: z.string().optional(),
  role: z.string().optional(),
  role_en: z.string().optional(),
  image: z.string().optional(),
  bio: z.string().optional(),
  bio_en: z.string().optional(),
});

const photoSchema = z.object({
  src: z.string(),
  // alt is locale-neutral and a11y-first; localizeStop leaves it untouched
  alt: z.string().optional(),
  caption: z.string().optional(),
  caption_en: z.string().optional(),
});

const expeditionSchema = z.object({
  world: z.string(),
  world_en: z.string().optional(),
  fire: z.string(),
  fire_en: z.string().optional(),
  frontier: z.string(),
  frontier_en: z.string().optional(),
});

const eventSchema = z.object({
  // string (not date) — current data includes ranges like "2026.05.05–07"
  date: z.string(),
  summary: z.string(),
  summary_en: z.string().optional(),
  link: z.url().optional(),
  linkLabel: z.string().optional(),
  linkLabel_en: z.string().optional(),
}).refine(
  // Either no linkLabel at all, or there's a link to label.
  // Catches "linkLabel without link" data errors at build time.
  (e) => !(e.linkLabel || e.linkLabel_en) || Boolean(e.link),
  { message: 'event.linkLabel / linkLabel_en require event.link' },
);

// PRESERVES the existing mixed naming convention exactly (terrainEn camelCase,
// label_en snake). See spec §3. Do NOT rename in this PR.
export const stopSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case ascii'),
  order: z.number().int().nonnegative(),
  visited: z.boolean(),
  isOrigin: z.boolean().optional(),
  anchor: z.boolean().optional(),

  label: z.string(),
  label_en: z.string().optional(),

  lng: z.number().gte(-180).lte(180),
  lat: z.number().gte(-90).lte(90),

  // strings — current parsing/display treats them as strings
  altitude: z.string(),
  terrain: z.string(),
  terrainEn: z.string(),
  terrainStep: z.string(),
  terrainStepEn: z.string(),
  climate: z.string(),
  climateEn: z.string(),
  challenge: z.string(),
  challengeEn: z.string(),

  relationType,
  themes: z.array(themeType),
  relationStats: z.array(z.string()),
  relationStatsEn: z.array(z.string()).optional(),

  event: eventSchema.optional(),
  expedition: expeditionSchema.optional(),
  people: z.array(personSchema).optional(),
  photos: z.array(photoSchema).optional(),
});

export type Stop = z.infer<typeof stopSchema>;
export type StopPerson = z.infer<typeof personSchema>;
export type StopPhoto = z.infer<typeof photoSchema>;
export type StopEvent = z.infer<typeof eventSchema>;
export type StopExpedition = z.infer<typeof expeditionSchema>;
export type StopRelationType = z.infer<typeof relationType>;
export type StopThemeType = z.infer<typeof themeType>;
