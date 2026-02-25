import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as bookingService from "../services/booking.service";

const bookings = new Hono();

const createBookingSchema = z.object({
  listing_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  delivery_method: z.enum(["pickup", "delivery"]).optional(),
  delivery_address: z.string().optional(),
  protection_plan: z.enum(["none", "basic", "premium"]).optional(),
});

const bookingIdSchema = z.object({
  id: z.string().uuid(),
});

bookings.post("/", requireAuth, zValidator("json", createBookingSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const result = await bookingService.createBooking(supabaseAdmin, env, userId, input);

  return c.json({ data: result }, 201);
});

bookings.get("/:id", requireAuth, zValidator("param", bookingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  const booking = await bookingService.getBooking(supabaseAdmin, id, userId);

  return c.json({ data: booking });
});

bookings.get("/", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const role = c.req.query("role") as "renter" | "owner" | undefined;

  const bookings = await bookingService.getUserBookings(supabaseAdmin, userId, role);

  return c.json({ data: bookings });
});

bookings.post("/:id/approve", requireAuth, zValidator("param", bookingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  const booking = await bookingService.approveBooking(supabaseAdmin, env, id, userId);

  return c.json({ data: booking });
});

bookings.post("/:id/decline", requireAuth, zValidator("param", bookingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  const booking = await bookingService.declineBooking(supabaseAdmin, env, id, userId);

  return c.json({ data: booking });
});

bookings.post("/:id/cancel", requireAuth, zValidator("param", bookingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");
  const { reason } = await c.req.json().catch(() => ({}));

  const booking = await bookingService.cancelBooking(supabaseAdmin, env, id, userId, reason);

  return c.json({ data: booking });
});

bookings.post("/:id/complete", requireAuth, zValidator("param", bookingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const { id } = c.req.valid("param");

  const booking = await bookingService.completeBooking(supabaseAdmin, id);

  return c.json({ data: booking });
});

export default bookings;
