import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import {
  bearerAuth,
  dataResponse,
  jsonContent,
  successResponse,
  uuidParam,
} from "../lib/openapi-helpers";
import { UploadUrlResponseSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as mediaService from "../services/media.service";
import type { Variables } from "../types/variables";

const media = new Hono<{ Bindings: Env; Variables: Variables }>();

media.use("*", optionalAuth);

media.post(
  "/upload-url",
  describeRoute({
    tags: ["Media"],
    summary: "Get signed upload URL",
    security: bearerAuth,
    responses: { 200: dataResponse(UploadUrlResponseSchema, "Upload URL created") },
  }),
  validator("json", z.object({ file_name: z.string(), content_type: z.string().optional() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { file_name, content_type } = c.req.valid("json");
    const data = await mediaService.createUploadUrl(supabaseAdmin, userId, file_name, content_type);
    return c.json({ data });
  }
);

media.post(
  "/:listingId/confirm",
  describeRoute({
    tags: ["Media"],
    summary: "Confirm media upload",
    security: bearerAuth,
    responses: {
      200: jsonContent(
        z.object({ data: z.object({ id: z.string().uuid(), url: z.string().url() }) }),
        "Upload confirmed"
      ),
    },
  }),
  validator("param", z.object({ listingId: z.string().uuid() })),
  validator("json", z.object({ path: z.string(), is_primary: z.boolean().optional() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { listingId } = c.req.valid("param");
    const { path, is_primary } = c.req.valid("json");
    const data = await mediaService.confirmUpload(
      supabaseAdmin,
      userId,
      listingId,
      path,
      is_primary
    );
    return c.json({ data });
  }
);

media.delete(
  "/:id",
  describeRoute({
    tags: ["Media"],
    summary: "Delete media",
    security: bearerAuth,
    responses: { 200: successResponse("Media deleted") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    await mediaService.deleteMedia(supabaseAdmin, userId, id);
    return c.json({ success: true });
  }
);

export default media;
