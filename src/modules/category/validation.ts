import { z } from 'zod';

export const slugParamSchema = z.object({
  slug: z.string(),
});

export type SlugParamInput = z.infer<typeof slugParamSchema>;