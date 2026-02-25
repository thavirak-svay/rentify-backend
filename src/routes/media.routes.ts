import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as mediaService from "../services/media.service";

const media = new Hono();

const uploadUrlSchema = z.object({
  file_name: z.string(),
  content_type: z.string().optional(),
});

const confirmUploadSchema = z.object({
  path: z.string(),
  is_primary: z.boolean().optional(),
});

media.post("/upload-url", requireAuth, zValidator("json", uploadUrlSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { file_name, content_type } = c.req.valid("json");

  const result = await mediaService.createUploadUrl(supabaseAdmin, userId, file_name, content_type);

  return c.json({ data: result });
});

media.post(
  "/:listingId/confirm",
  requireAuth,
  zValidator("json", confirmUploadSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    const listingId = c.req.param("listingId");
    const { path, is_primary } = c.req.valid("json");

    const result = await mediaService.confirmUpload(supabaseAdmin, userId, listingId, path, is_primary);

    return c.json({ data: result });
  }
);

media.delete("/:id", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const mediaId = c.req.param("id");

  await mediaService.deleteMedia(supabaseAdmin, userId, mediaId);

  return c.json({ success: true });
});

export default media;