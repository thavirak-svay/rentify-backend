import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth";
import * as listingService from "../services/listing.service";
import { createListingSchema, updateListingSchema, listingIdSchema } from "../lib/validators";

const listings = new Hono();

listings.post("/", requireAuth, zValidator("json", createListingSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const listing = await listingService.createListing(supabaseAdmin, userId, input);

  return c.json({ data: listing }, 201);
});

listings.get("/:id", zValidator("param", listingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const { id } = c.req.valid("param");

  const { listing, media } = await listingService.getListingWithMedia(supabaseAdmin, id);

  return c.json({ data: { ...listing, media } });
});

listings.patch(
  "/:id",
  requireAuth,
  zValidator("param", listingIdSchema),
  zValidator("json", updateListingSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const listing = await listingService.updateListing(supabaseAdmin, id, userId, input);

    return c.json({ data: listing });
  }
);

listings.delete("/:id", requireAuth, zValidator("param", listingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  await listingService.deleteListing(supabaseAdmin, id, userId);

  return c.json({ success: true });
});

listings.post("/:id/publish", requireAuth, zValidator("param", listingIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  const listing = await listingService.publishListing(supabaseAdmin, id, userId);

  return c.json({ data: listing });
});

listings.get("/my/listings", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const status = c.req.query("status");

  const listings = await listingService.getUserListings(supabaseAdmin, userId, status);

  return c.json({ data: listings });
});

export default listings;
