import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { z } from 'zod';
import type { Env } from '../../config/env';
import { ListingSchema, ListingWithMediaSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataArrayResponse, dataResponse, successResponse, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as listingService from './service';

const listings = new Hono<{ Bindings: Env; Variables: Variables }>();

listings.use('*', optionalAuth);

import { createListingSchema } from '../../shared/lib/validation';

listings.post(
  '/',
  describeRoute({
    tags: ['Listings'],
    summary: 'Create a new listing',
    security: bearerAuth,
    responses: { 201: dataResponse(ListingSchema, 'Listing created successfully') },
  }),
  validator('json', createListingSchema),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const INPUT = c.req.valid('json');
    const DATA = await listingService.createListing(SUPABASE_ADMIN, USER_ID, INPUT);
    return c.json({ data: DATA }, 201);
  },
);

listings.get(
  '/:id',
  describeRoute({
    tags: ['Listings'],
    summary: 'Get listing by ID',
    responses: { 200: dataResponse(ListingWithMediaSchema, 'Listing details') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { id } = c.req.valid('param');
    const { listing, media } = await listingService.getListingWithMedia(SUPABASE_ADMIN, id);
    return c.json({ data: { ...listing, media } });
  },
);

listings.patch(
  '/:id',
  describeRoute({
    tags: ['Listings'],
    summary: 'Update a listing',
    security: bearerAuth,
    responses: { 200: dataResponse(ListingSchema, 'Listing updated successfully') },
  }),
  validator('param', uuidParam),
  validator('json', createListingSchema.partial()),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const INPUT = c.req.valid('json');
    const DATA = await listingService.updateListing(SUPABASE_ADMIN, id, USER_ID, INPUT);
    return c.json({ data: DATA });
  },
);

listings.delete(
  '/:id',
  describeRoute({
    tags: ['Listings'],
    summary: 'Delete a listing',
    security: bearerAuth,
    responses: { 200: successResponse('Listing deleted successfully') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    await listingService.deleteListing(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ success: true });
  },
);

listings.post(
  '/:id/publish',
  describeRoute({
    tags: ['Listings'],
    summary: 'Publish a listing',
    security: bearerAuth,
    responses: { 200: dataResponse(ListingSchema, 'Listing published successfully') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const DATA = await listingService.publishListing(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ data: DATA });
  },
);

listings.get(
  '/my/listings',
  describeRoute({
    tags: ['Listings'],
    summary: "Get current user's listings",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(ListingSchema, "List of user's listings") },
  }),
  validator(
    'query',
    z.object({
      status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
    }),
  ),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { status } = c.req.valid('query');
    const DATA = await listingService.getUserListings(SUPABASE_ADMIN, USER_ID, status);
    return c.json({ data: DATA });
  },
);

export default listings;
