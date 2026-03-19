import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import type { Env } from '@/config/env';
import { SearchListingSchema } from '@/shared/lib/api-schemas';
import { dataArrayResponse } from '@/shared/lib/openapi';
import { getContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as searchService from './service';
import { searchQuerySchema } from './validation';

const search = new Hono<{ Bindings: Env; Variables: Variables }>();

search.use('*', optionalAuth);

search.get(
  '/',
  describeRoute({
    tags: ['Search'],
    summary: 'Search listings',
    responses: { 200: dataArrayResponse(SearchListingSchema, 'Search results') },
  }),
  validator('query', searchQuerySchema),
  async (c) => {
    const { supabase } = getContext(c);
    const params = c.req.valid('query');
    const data = await searchService.searchListings(supabase, params);
    return c.json({ data });
  },
);

export default search;