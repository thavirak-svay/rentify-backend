import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";

import { z } from "zod";
import type { Env } from "../config/env";
import {
  bearerAuth,
  dataArrayResponse,
  dataResponse,
  successResponse,
  uuidParam,
} from "../lib/openapi-helpers";
import { ListingSchema, ListingWithMediaSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as listingService from "../services/listing.service";
import type { Variables } from "../types/variables";

const listings = new Hono<{ Bindings: Env; Variables: Variables }>();

listings.use("*", optionalAuth);

import { createListingSchema } from "../lib/validators";

listings.post(
  "/",
  describeRoute({
    tags: ["Listings"],
    summary: "Create a new listing",
    security: bearerAuth,
    responses: { 201: dataResponse(ListingSchema, "Listing created successfully") },
  }),
  validator("json", createListingSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const input = c.req.valid("json");
    const data = await listingService.createListing(supabaseAdmin, userId, input);
    return c.json({ data }, 201);
  }
);

listings.get(
  "/:id",
  describeRoute({
    tags: ["Listings"],
    summary: "Get listing by ID",
    responses: { 200: dataResponse(ListingWithMediaSchema, "Listing details") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { id } = c.req.valid("param");
    const { listing, media } = await listingService.getListingWithMedia(supabaseAdmin, id);
    return c.json({ data: { ...listing, media } });
  }
);

listings.patch(
  "/:id",
  describeRoute({
    tags: ["Listings"],
    summary: "Update a listing",
    security: bearerAuth,
    responses: { 200: dataResponse(ListingSchema, "Listing updated successfully") },
  }),
  validator("param", uuidParam),
  validator("json", createListingSchema.partial()),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const data = await listingService.updateListing(supabaseAdmin, id, userId, input);
    return c.json({ data });
  }
);

listings.delete(
  "/:id",
  describeRoute({
    tags: ["Listings"],
    summary: "Delete a listing",
    security: bearerAuth,
    responses: { 200: successResponse("Listing deleted successfully") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    await listingService.deleteListing(supabaseAdmin, id, userId);
    return c.json({ success: true });
  }
);

listings.post(
  "/:id/publish",
  describeRoute({
    tags: ["Listings"],
    summary: "Publish a listing",
    security: bearerAuth,
    responses: { 200: dataResponse(ListingSchema, "Listing published successfully") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const data = await listingService.publishListing(supabaseAdmin, id, userId);
    return c.json({ data });
  }
);

listings.get(
  "/my/listings",
  describeRoute({
    tags: ["Listings"],
    summary: "Get current user's listings",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(ListingSchema, "List of user's listings") },
  }),
  validator(
    "query",
    z.object({
      status: z.enum(["draft", "active", "paused", "archived"]).optional(),
    })
  ),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { status } = c.req.valid("query");
    const data = await listingService.getUserListings(supabaseAdmin, userId, status);
    return c.json({ data });
  }
);

export default listings;
