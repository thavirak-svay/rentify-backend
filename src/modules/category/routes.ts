import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { CategorySchema } from '../../shared/lib/api-schemas';
import { dataArrayResponse, dataResponse } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const DATA = await categoryService.getCategories(SUPABASE_ADMIN);
    return c.json({ data: DATA });
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { slug } = c.req.valid('param');
    const DATA = await categoryService.getCategory(SUPABASE_ADMIN, slug);
    return c.json({ data: DATA });
  },
);

export default categories;
