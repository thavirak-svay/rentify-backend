import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { MAX_COMMENT_LENGTH, MAX_RATING, MIN_RATING } from '@/constants/review';
import { ReviewSchema } from '@/shared/lib/api-schemas';
import { AuthenticationError } from '@/shared/lib/errors';
import { bearerAuth, dataArrayResponse, dataResponse } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as reviewService from './service';

const reviews = new Hono<{ Bindings: Env; Variables: Variables }>();

reviews.use('*', optionalAuth);

const createReviewSchema = z.object({
  booking_id: z.uuid(),
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
});

reviews.post(
  '/',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Create a review (post-booking only)',
    security: bearerAuth,
    responses: { 201: dataResponse(ReviewSchema, 'Review created successfully') },
  }),
  validator('json', createReviewSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const input = c.req.valid('json');
    const data = await reviewService.createReview(supabaseAdmin, userId, input);
    return c.json({ data: data }, 201);
  },
);

reviews.get(
  '/listings/:listingId',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a listing',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', z.object({ listingId: z.uuid() })),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { listingId } = c.req.valid('param');
    const data = await reviewService.getListingReviews(supabaseAdmin, listingId);
    return c.json({ data: data });
  },
);

reviews.get(
  '/users/:userId',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a user',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', z.object({ userId: z.uuid() })),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { userId } = c.req.valid('param');
    const data = await reviewService.getUserReviews(supabaseAdmin, userId);
    return c.json({ data: data });
  },
);

export default reviews;
