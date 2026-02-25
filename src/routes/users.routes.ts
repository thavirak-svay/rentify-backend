import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { bearerAuth, dataResponse, uuidParam } from "../lib/openapi-helpers";
import { ProfileSchema, PublicProfileSchema } from "../lib/schemas";
import { log } from "../middleware/logger";
import { optionalAuth } from "../middleware/optional-auth";
import * as userService from "../services/user.service";
import type { Variables } from "../types/variables";

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

users.use("*", optionalAuth);

users.get(
  "/me",
  describeRoute({
    tags: ["Users"],
    summary: "Get current user profile",
    security: bearerAuth,
    responses: { 200: dataResponse(ProfileSchema, "Current user profile") },
  }),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const data = await userService.getProfile(supabaseAdmin, userId);
    userService
      .updateLastActive(supabaseAdmin, userId)
      .catch((err) => log.error({ err, userId }, "Failed to update last active"));
    return c.json({ data });
  }
);

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  address_city: z.string().max(100).optional(),
  address_country: z.string().length(2).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account_masked: z.string().max(20).optional(),
  payway_beneficiary_id: z.string().optional(),
});

users.patch(
  "/me",
  describeRoute({
    tags: ["Users"],
    summary: "Update current user profile",
    security: bearerAuth,
    responses: { 200: dataResponse(ProfileSchema, "Updated profile") },
  }),
  validator("json", UpdateProfileSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const input = c.req.valid("json");
    const data = await userService.updateProfile(supabaseAdmin, userId, input);
    return c.json({ data });
  }
);

users.get(
  "/:id",
  describeRoute({
    tags: ["Users"],
    summary: "Get public user profile",
    responses: { 200: dataResponse(PublicProfileSchema, "Public user profile") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { id } = c.req.valid("param");
    const profile = await userService.getPublicProfile(supabaseAdmin, id);
    return c.json({ data: profile });
  }
);

export default users;
