import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { DELIVERY_METHOD, PROTECTION_PLAN } from '@/constants/payment';
import { BookingSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, createDataResponseFactory, dataArrayResponse, jsonContent, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext, getContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as bookingService from './service';

const bookings = new Hono<{ Bindings: Env; Variables: Variables }>();

const tag = 'Bookings';
const bookingResponse = createDataResponseFactory(BookingSchema);

const createBookingSchema = z.object({
  listing_id: z.uuid(),
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  delivery_method: z.enum(DELIVERY_METHOD).optional(),
  delivery_address: z.string().optional(),
  protection_plan: z.enum(PROTECTION_PLAN).optional(),
});

const cancelBookingSchema = z.object({ reason: z.string().optional() });

bookings.use('*', optionalAuth);

bookings.post(
  '/',
  describeRoute({
    tags: [tag],
    summary: 'Create a booking request',
    security: bearerAuth,
    responses: {
      201: jsonContent(z.object({ data: z.object({ booking: BookingSchema, checkout_url: z.string() }) }), 'Booking created with payment URL'),
    },
  }),
  validator('json', createBookingSchema),
  async (c) => {
    const { supabase, env, userId } = getAuthContext(c);
    const input = c.req.valid('json');
    const result = await bookingService.createBooking(supabase, env, userId, input);
    return c.json({ data: result }, 201);
  },
);

bookings.get(
  '/:id',
  describeRoute({
    tags: [tag],
    summary: 'Get booking by ID',
    security: bearerAuth,
    responses: { 200: bookingResponse('Booking details') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const data = await bookingService.getBooking(supabase, id, userId);
    return c.json({ data });
  },
);

bookings.get(
  '/',
  describeRoute({
    tags: [tag],
    summary: "List user's bookings",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(BookingSchema, 'List of bookings') },
  }),
  validator('query', z.object({ role: z.enum(['renter', 'owner']).optional() })),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { role } = c.req.valid('query');
    const data = await bookingService.getUserBookings(supabase, userId, role);
    return c.json({ data });
  },
);

bookings.post(
  '/:id/approve',
  describeRoute({
    tags: [tag],
    summary: 'Approve a booking request',
    security: bearerAuth,
    responses: { 200: bookingResponse('Booking approved') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, env, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const data = await bookingService.approveBooking(supabase, env, id, userId);
    return c.json({ data });
  },
);

bookings.post(
  '/:id/decline',
  describeRoute({
    tags: [tag],
    summary: 'Decline a booking request',
    security: bearerAuth,
    responses: { 200: bookingResponse('Booking declined') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, env, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const data = await bookingService.declineBooking(supabase, env, id, userId);
    return c.json({ data });
  },
);

bookings.post(
  '/:id/cancel',
  describeRoute({
    tags: [tag],
    summary: 'Cancel a booking',
    security: bearerAuth,
    responses: { 200: bookingResponse('Booking cancelled') },
  }),
  validator('param', uuidParam),
  validator('json', cancelBookingSchema),
  async (c) => {
    const { supabase, env, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const { reason } = c.req.valid('json');
    const data = await bookingService.cancelBooking(supabase, env, id, userId, reason);
    return c.json({ data });
  },
);

bookings.post(
  '/:id/activate',
  describeRoute({
    tags: [tag],
    summary: 'Mark booking as active (start rental)',
    responses: { 200: bookingResponse('Booking activated') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const data = await bookingService.activateBooking(supabase, id);
    return c.json({ data });
  },
);

bookings.post(
  '/:id/complete',
  describeRoute({
    tags: [tag],
    summary: 'Mark booking as completed',
    responses: { 200: bookingResponse('Booking completed') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const data = await bookingService.completeBooking(supabase, id);
    return c.json({ data });
  },
);

export default bookings;