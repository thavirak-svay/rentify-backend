import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import {
  bearerAuth,
  dataArrayResponse,
  dataResponse,
  jsonContent,
  uuidParam,
} from "../lib/openapi-helpers";
import { BookingSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as bookingService from "../services/booking.service";
import type { Variables } from "../types/variables";

const bookings = new Hono<{ Bindings: Env; Variables: Variables }>();

bookings.use("*", optionalAuth);

const CreateBookingSchema = z.object({
  listing_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  delivery_method: z.enum(["pickup", "delivery"]).optional(),
  delivery_address: z.string().optional(),
  protection_plan: z.enum(["none", "basic", "premium"]).optional(),
});

bookings.post(
  "/",
  describeRoute({
    tags: ["Bookings"],
    summary: "Create a booking request",
    security: bearerAuth,
    responses: {
      201: jsonContent(
        z.object({ data: z.object({ booking: BookingSchema, checkout_url: z.string() }) }),
        "Booking created with payment URL"
      ),
    },
  }),
  validator("json", CreateBookingSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const input = c.req.valid("json");
    const result = await bookingService.createBooking(supabaseAdmin, env, userId, input);
    return c.json({ data: result }, 201);
  }
);

bookings.get(
  "/:id",
  describeRoute({
    tags: ["Bookings"],
    summary: "Get booking by ID",
    security: bearerAuth,
    responses: { 200: dataResponse(BookingSchema, "Booking details") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const data = await bookingService.getBooking(supabaseAdmin, id, userId);
    return c.json({ data });
  }
);

bookings.get(
  "/",
  describeRoute({
    tags: ["Bookings"],
    summary: "List user's bookings",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(BookingSchema, "List of bookings") },
  }),
  validator("query", z.object({ role: z.enum(["renter", "owner"]).optional() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { role } = c.req.valid("query");
    const data = await bookingService.getUserBookings(supabaseAdmin, userId, role);
    return c.json({ data });
  }
);

bookings.post(
  "/:id/approve",
  describeRoute({
    tags: ["Bookings"],
    summary: "Approve a booking request",
    security: bearerAuth,
    responses: { 200: dataResponse(BookingSchema, "Booking approved") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const data = await bookingService.approveBooking(supabaseAdmin, env, id, userId);
    return c.json({ data });
  }
);

bookings.post(
  "/:id/decline",
  describeRoute({
    tags: ["Bookings"],
    summary: "Decline a booking request",
    security: bearerAuth,
    responses: { 200: dataResponse(BookingSchema, "Booking declined") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const data = await bookingService.declineBooking(supabaseAdmin, env, id, userId);
    return c.json({ data });
  }
);

bookings.post(
  "/:id/cancel",
  describeRoute({
    tags: ["Bookings"],
    summary: "Cancel a booking",
    security: bearerAuth,
    responses: { 200: dataResponse(BookingSchema, "Booking cancelled") },
  }),
  validator("param", uuidParam),
  validator("json", z.object({ reason: z.string().optional() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const { reason } = c.req.valid("json");
    const data = await bookingService.cancelBooking(supabaseAdmin, env, id, userId, reason);
    return c.json({ data });
  }
);

bookings.post(
  "/:id/complete",
  describeRoute({
    tags: ["Bookings"],
    summary: "Mark booking as completed",
    responses: { 200: dataResponse(BookingSchema, "Booking completed") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { id } = c.req.valid("param");
    const data = await bookingService.completeBooking(supabaseAdmin, id);
    return c.json({ data });
  }
);

export default bookings;
