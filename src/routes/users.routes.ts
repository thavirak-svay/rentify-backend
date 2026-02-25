import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth";
import * as userService from "../services/user.service";
import { updateProfileSchema } from "../services/user.service";

const users = new Hono();

users.get("/me", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");

  const profile = await userService.getProfile(supabaseAdmin, userId);

  userService.updateLastActive(supabaseAdmin, userId).catch(console.error);

  return c.json({ data: profile });
});

users.patch("/me", requireAuth, zValidator("json", updateProfileSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const profile = await userService.updateProfile(supabaseAdmin, userId, input);

  return c.json({ data: profile });
});

users.get("/:id", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.req.param("id");

  const profile = await userService.getPublicProfile(supabaseAdmin, userId);

  return c.json({ data: profile });
});

export default users;