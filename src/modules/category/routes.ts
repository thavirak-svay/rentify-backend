import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { CategorySchema } from '@/shared/lib/api-schemas';
import { dataArrayResponse, dataResponse } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as categoryService from './service';

const categories = new Hono<{ Bindings: Env; Variables: Variables }>();

categories.use('*', optionalAuth);

categories.get(
  '/',
  describeRoute({
    tags: ['Categories'],
    summary: 'List all categories',
    responses: { 200: dataArrayResponse(CategorySchema, 'List of categories') },
  }),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const data = await categoryService.getCategories(supabaseAdmin);
    return c.json({ data: data });
  },
);

categories.get(
  '/:slug',
  describeRoute({
    tags: ['Categories'],
    summary: 'Get category by slug',
    responses: { 200: dataResponse(CategorySchema, 'Category details') },
  }),
  validator('param', z.object({ slug: z.string() })),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { slug } = c.req.valid('param');
    const data = await categoryService.getCategory(supabaseAdmin, slug);
    return c.json({ data: data });
  },
);

export default categories;
