import { z } from 'astro/zod';

export const personFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'person id must be kebab-case ascii'),
  name: z.string(),
  name_en: z.string().optional(),
  role: z.string().optional(),
  role_en: z.string().optional(),
  image: z.string().optional(),
});

export type PersonFrontmatter = z.infer<typeof personFrontmatterSchema>;
