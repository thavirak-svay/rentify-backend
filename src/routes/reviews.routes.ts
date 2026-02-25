import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as reviewService from "../services/review.service";

const reviews = new Hono();

const createReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const listingIdSchema = z.object({
  listingId: z.string().uuid(),
});

const userIdSchema = z.object({
  userId: z.string().uuid(),
});

reviews.post("/", requireAuth, zValidator("json", createReviewSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const review = await reviewService.createReview(supabaseAdmin, userId, input);

  return c.json({ data: review }, 201);
});

reviews.get(
  "/listings/:listingId",
  zValidator("param", listingIdSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { listingId } = c.req.valid("param");

    const reviews = await reviewService.getListingReviews(supabaseAdmin, listingId);

    return c.json({ data: reviews });
  }
);

reviews.get("/users/:userId", zValidator("param", userIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const { userId } = c.req.valid("param");

  const reviews = await reviewService.getUserReviews(supabaseAdmin, userId);

  return c.json({ data: reviews });
});

export default reviews;