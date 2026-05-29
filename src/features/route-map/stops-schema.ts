import { z } from 'astro/zod';

const relationType = z.enum(['departure', 'education', 'community', 'industry']);
const themeType = z.enum(['science', 'maker', 'industry']);

export const stopFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().nonnegative(),
  visited: z.boolean(),
  isOrigin: z.boolean().optional(),
  anchor: z.boolean().optional(),

  label: z.string(),
  label_en: z.string().optional(),

  lng: z.number().gte(-180).lte(180),
  lat: z.number().gte(-90).lte(90),
  altitude: z.string(),

  relationType,
  themes: z.array(themeType),

  event: z.object({
    date: z.string(),
    link: z.url().optional(),
  }).optional(),

  people: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
});

export type StopFrontmatter = z.infer<typeof stopFrontmatterSchema>;
export type StopRelationType = z.infer<typeof relationType>;
export type StopThemeType = z.infer<typeof themeType>;
