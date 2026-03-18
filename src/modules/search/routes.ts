import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { SearchListingSchema } from '../../shared/lib/api-schemas';
import { dataArrayResponse } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as searchService from './service';

const search = new Hono<{ Bindings: Env; Variables: Variables }>();

search.use('*', optionalAuth);

search.get(
  '/',
  describeRoute({
    tags: ['Search'],
    summary: 'Search listings',
    responses: { 200: dataArrayResponse(SearchListingSchema, 'Search results') },
  }),
  validator(
    'query',
    z.object({
      q: z.string().optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      radius: z.coerce.number().min(1).max(1000).optional().default(25),
      category: z.string().optional(),
      type: z.enum(['offer', 'request']).optional(),
      min_price: z.coerce.number().int().min(0).optional(),
      max_price: z.coerce.number().int().min(0).optional(),
      sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).optional().default('relevance'),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      offset: z.coerce.number().int().min(0).optional().default(0),
    }),
  ),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const PARAMS = c.req.valid('query');
    const DATA = await searchService.searchListings(SUPABASE_ADMIN, PARAMS);
    return c.json({ data: DATA });
  },
);

export default search;
