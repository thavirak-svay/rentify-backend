import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@/constants/api';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM } from '@/constants/search';
import { SearchListingSchema } from '@/shared/lib/api-schemas';
import { dataArrayResponse } from '@/shared/lib/openapi';
import { getContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
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
      radius: z.coerce.number().min(1).max(MAX_SEARCH_RADIUS_KM).default(DEFAULT_SEARCH_RADIUS_KM),
      category: z.string().optional(),
      type: z.enum(['offer', 'request']).optional(),
      min_price: z.coerce.number().int().min(0).optional(),
      max_price: z.coerce.number().int().min(0).optional(),
      sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).default('relevance'),
      limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (c) => {
    const { supabase } = getContext(c);
    const params = c.req.valid('query');
    const data = await searchService.searchListings(supabase, params);
    return c.json({ data });
  },
);

export default search;