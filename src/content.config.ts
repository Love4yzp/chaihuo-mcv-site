import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    date: z.string(),
    description: z.string(),
    description_en: z.string().optional(),
    image: z.string().url(),
    tags: z.array(z.string()),
    yuqueUrl: z.string().url().optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ base: './src/content/docs', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    date: z.string(),
    category: z.enum(['人物访谈', '路上VLOG', '公益合作纪录片']),
    description: z.string(),
    description_en: z.string().optional(),
    author: z.string().optional(),
    author_en: z.string().optional(),
    readTime: z.string().optional(),
    readTime_en: z.string().optional(),
    coverImage: z.string().url().optional(),
    videoLinks: z.array(z.object({
      platform: z.string(),
      url: z.string(),
    })).default([]),
    pdfName: z.string().optional(),
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

export const collections = { notes, docs, equipment, team, faq, partners, heroes };
