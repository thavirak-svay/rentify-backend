import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { BookingSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, createDataResponseFactory, dataArrayResponse, jsonContent, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as bookingService from './service';

const bookings = new Hono<{ Bindings: Env; Variables: Variables }>();

// DRY: Constants and factories
const TAG = 'Bookings';
const BOOKING_RESPONSE = createDataResponseFactory(BookingSchema);

// Schemas
const CREATE_BOOKING_SCHEMA = z.object({
  listing_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  delivery_method: z.enum(['pickup', 'delivery']).optional(),
  delivery_address: z.string().optional(),
  protection_plan: z.enum(['none', 'basic', 'premium']).optional(),
});

const CANCEL_BOOKING_SCHEMA = z.object({ reason: z.string().optional() });

// Routes
bookings.use('*', optionalAuth);

bookings.post(
  '/',
  describeRoute({
    tags: [TAG],
    summary: 'Create a booking request',
    security: bearerAuth,
    responses: {
      201: jsonContent(z.object({ data: z.object({ booking: BookingSchema, checkout_url: z.string() }) }), 'Booking created with payment URL'),
    },
  }),
  validator('json', CREATE_BOOKING_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const INPUT = c.req.valid('json');
    const RESULT = await bookingService.createBooking(SUPABASE_ADMIN, ENV, USER_ID, INPUT);
    return c.json({ data: RESULT }, 201);
  },
);

bookings.get(
  '/:id',
  describeRoute({
    tags: [TAG],
    summary: 'Get booking by ID',
    security: bearerAuth,
    responses: { 200: BOOKING_RESPONSE('Booking details') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const DATA = await bookingService.getBooking(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ data: DATA });
  },
);

bookings.get(
  '/',
  describeRoute({
    tags: [TAG],
    summary: "List user's bookings",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(BookingSchema, 'List of bookings') },
  }),
  validator('query', z.object({ role: z.enum(['renter', 'owner']).optional() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { role } = c.req.valid('query');
    const DATA = await bookingService.getUserBookings(SUPABASE_ADMIN, USER_ID, role);
    return c.json({ data: DATA });
  },
);

bookings.post(
  '/:id/approve',
  describeRoute({
    tags: [TAG],
    summary: 'Approve a booking request',
    security: bearerAuth,
    responses: { 200: BOOKING_RESPONSE('Booking approved') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const DATA = await bookingService.approveBooking(SUPABASE_ADMIN, ENV, id, USER_ID);
    return c.json({ data: DATA });
  },
);

bookings.post(
  '/:id/decline',
  describeRoute({
    tags: [TAG],
    summary: 'Decline a booking request',
    security: bearerAuth,
    responses: { 200: BOOKING_RESPONSE('Booking declined') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const DATA = await bookingService.declineBooking(SUPABASE_ADMIN, ENV, id, USER_ID);
    return c.json({ data: DATA });
  },
);

bookings.post(
  '/:id/cancel',
  describeRoute({
    tags: [TAG],
    summary: 'Cancel a booking',
    security: bearerAuth,
    responses: { 200: BOOKING_RESPONSE('Booking cancelled') },
  }),
  validator('param', uuidParam),
  validator('json', CANCEL_BOOKING_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const { reason } = c.req.valid('json');
    const DATA = await bookingService.cancelBooking(SUPABASE_ADMIN, ENV, id, USER_ID, reason);
    return c.json({ data: DATA });
  },
);

bookings.post(
  '/:id/activate',
  describeRoute({
    tags: [TAG],
    summary: 'Mark booking as active (start rental)',
    responses: { 200: BOOKING_RESPONSE('Booking activated') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { id } = c.req.valid('param');
    const DATA = await bookingService.activateBooking(SUPABASE_ADMIN, id);
    return c.json({ data: DATA });
  },
);

bookings.post(
  '/:id/complete',
  describeRoute({
    tags: [TAG],
    summary: 'Mark booking as completed',
    responses: { 200: BOOKING_RESPONSE('Booking completed') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { id } = c.req.valid('param');
    const DATA = await bookingService.completeBooking(SUPABASE_ADMIN, id);
    return c.json({ data: DATA });
  },
);

export default bookings;
