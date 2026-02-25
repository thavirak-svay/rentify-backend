import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as notificationService from "../services/notification.service";

const notifications = new Hono();

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

notifications.get("/", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;
  const unreadOnly = c.req.query("unread") === "true";

  const notifications = await notificationService.getUserNotifications(supabaseAdmin, userId, limit, unreadOnly);

  return c.json({ data: notifications });
});

notifications.get("/unread-count", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");

  const count = await notificationService.getUnreadCount(supabaseAdmin, userId);

  return c.json({ data: { count } });
});

notifications.post("/:id/read", requireAuth, zValidator("param", notificationIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  await notificationService.markAsRead(supabaseAdmin, id, userId);

  return c.json({ success: true });
});

notifications.post("/mark-all-read", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");

  await notificationService.markAllAsRead(supabaseAdmin, userId);

  return c.json({ success: true });
});

export default notifications;