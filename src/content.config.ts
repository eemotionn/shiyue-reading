import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    lang: z.enum(['zh', 'en']),
    pair: z.string().optional(),
    date: z.coerce.date(),
    source: z.string().url().optional(),
    summary: z.string().optional(),
  }),
});

export const collections = { articles };
