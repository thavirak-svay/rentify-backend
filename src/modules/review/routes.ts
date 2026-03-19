import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import type { Env } from '@/config/env';
import { ReviewSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, dataArrayResponse, dataResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext, getContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as reviewService from './service';
import { createReviewSchema } from './validation';

const reviews = new Hono<{ Bindings: Env; Variables: Variables }>();

reviews.use('*', optionalAuth);

reviews.post(
  '/',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Create a review',
    security: bearerAuth,
    responses: { 201: dataResponse(ReviewSchema, 'Review created') },
  }),
  validator('json', createReviewSchema),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const input = c.req.valid('json');
    const data = await reviewService.createReview(supabase, userId, input);
    return c.json({ data }, 201);
  },
);

reviews.get(
  '/listing/:id',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a listing',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const data = await reviewService.getListingReviews(supabase, id);
    return c.json({ data });
  },
);

reviews.get(
  '/user/:id',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a user',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const data = await reviewService.getUserReviews(supabase, id);
    return c.json({ data });
  },
);

export default reviews;