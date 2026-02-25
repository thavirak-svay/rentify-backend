import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { bearerAuth, dataArrayResponse, dataResponse } from "../lib/openapi-helpers";
import { ReviewSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as reviewService from "../services/review.service";
import type { Variables } from "../types/variables";

const reviews = new Hono<{ Bindings: Env; Variables: Variables }>();

reviews.use("*", optionalAuth);

const CreateReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

reviews.post(
  "/",
  describeRoute({
    tags: ["Reviews"],
    summary: "Create a review (post-booking only)",
    security: bearerAuth,
    responses: { 201: dataResponse(ReviewSchema, "Review created successfully") },
  }),
  validator("json", CreateReviewSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const input = c.req.valid("json");
    const data = await reviewService.createReview(supabaseAdmin, userId, input);
    return c.json({ data }, 201);
  }
);

reviews.get(
  "/listings/:listingId",
  describeRoute({
    tags: ["Reviews"],
    summary: "Get reviews for a listing",
    responses: { 200: dataArrayResponse(ReviewSchema, "List of reviews") },
  }),
  validator("param", z.object({ listingId: z.string().uuid() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { listingId } = c.req.valid("param");
    const data = await reviewService.getListingReviews(supabaseAdmin, listingId);
    return c.json({ data });
  }
);

reviews.get(
  "/users/:userId",
  describeRoute({
    tags: ["Reviews"],
    summary: "Get reviews for a user",
    responses: { 200: dataArrayResponse(ReviewSchema, "List of reviews") },
  }),
  validator("param", z.object({ userId: z.string().uuid() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { userId } = c.req.valid("param");
    const data = await reviewService.getUserReviews(supabaseAdmin, userId);
    return c.json({ data });
  }
);

export default reviews;
