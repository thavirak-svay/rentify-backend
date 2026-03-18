import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { ReviewSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataArrayResponse, dataResponse } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as reviewService from './service';

const reviews = new Hono<{ Bindings: Env; Variables: Variables }>();

reviews.use('*', optionalAuth);

const CREATE_REVIEW_SCHEMA = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

reviews.post(
  '/',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Create a review (post-booking only)',
    security: bearerAuth,
    responses: { 201: dataResponse(ReviewSchema, 'Review created successfully') },
  }),
  validator('json', CREATE_REVIEW_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const INPUT = c.req.valid('json');
    const DATA = await reviewService.createReview(SUPABASE_ADMIN, USER_ID, INPUT);
    return c.json({ data: DATA }, 201);
  },
);

reviews.get(
  '/listings/:listingId',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a listing',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', z.object({ listingId: z.string().uuid() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { listingId } = c.req.valid('param');
    const DATA = await reviewService.getListingReviews(SUPABASE_ADMIN, listingId);
    return c.json({ data: DATA });
  },
);

reviews.get(
  '/users/:userId',
  describeRoute({
    tags: ['Reviews'],
    summary: 'Get reviews for a user',
    responses: { 200: dataArrayResponse(ReviewSchema, 'List of reviews') },
  }),
  validator('param', z.object({ userId: z.string().uuid() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { userId } = c.req.valid('param');
    const DATA = await reviewService.getUserReviews(SUPABASE_ADMIN, userId);
    return c.json({ data: DATA });
  },
);

export default reviews;
