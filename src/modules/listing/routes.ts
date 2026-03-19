import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { LISTING_STATUS } from '@/constants/listing';
import { ListingSchema, ListingWithMediaSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, dataArrayResponse, dataResponse, successResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext, getContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as listingService from './service';
import { createListingSchema } from './validation';

const listings = new Hono<{ Bindings: Env; Variables: Variables }>();

listings.use('*', optionalAuth);

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
    const { supabase, userId } = getAuthContext(c);
    const input = c.req.valid('json');
    const data = await listingService.createListing(supabase, userId, input);
    return c.json({ data }, 201);
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
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const { listing, media } = await listingService.getListingWithMedia(supabase, id);
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
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');
    const data = await listingService.updateListing(supabase, id, userId, input);
    return c.json({ data });
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
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    await listingService.deleteListing(supabase, id, userId);
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
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const data = await listingService.publishListing(supabase, id, userId);
    return c.json({ data });
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
      status: z.enum(Object.values(LISTING_STATUS) as [string, ...string[]]).optional(),
    }),
  ),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { status } = c.req.valid('query');
    const data = await listingService.getUserListings(supabase, userId, status);
    return c.json({ data });
  },
);

export default listings;