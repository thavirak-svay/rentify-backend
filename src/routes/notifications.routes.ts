import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import {
  bearerAuth,
  dataArrayResponse,
  jsonContent,
  successResponse,
  uuidParam,
} from "../lib/openapi-helpers";
import { NotificationSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as notificationService from "../services/notification.service";
import type { Variables } from "../types/variables";

const notifications = new Hono<{ Bindings: Env; Variables: Variables }>();

notifications.use("*", optionalAuth);

notifications.get(
  "/",
  describeRoute({
    tags: ["Notifications"],
    summary: "List user notifications",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(NotificationSchema, "List of notifications") },
  }),
  validator(
    "query",
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      unread: z.enum(["true", "false"]).optional(),
    })
  ),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { limit, unread } = c.req.valid("query");
    const data = await notificationService.getUserNotifications(
      supabaseAdmin,
      userId,
      limit,
      unread === "true"
    );
    return c.json({ data });
  }
);

notifications.get(
  "/unread-count",
  describeRoute({
    tags: ["Notifications"],
    summary: "Get unread notification count",
    security: bearerAuth,
    responses: {
      200: jsonContent(z.object({ data: z.object({ count: z.number() }) }), "Unread count"),
    },
  }),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const count = await notificationService.getUnreadCount(supabaseAdmin, userId);
    return c.json({ data: { count } });
  }
);

notifications.post(
  "/:id/read",
  describeRoute({
    tags: ["Notifications"],
    summary: "Mark notification as read",
    security: bearerAuth,
    responses: { 200: successResponse("Notification marked as read") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    await notificationService.markAsRead(supabaseAdmin, id, userId);
    return c.json({ success: true });
  }
);

notifications.post(
  "/mark-all-read",
  describeRoute({
    tags: ["Notifications"],
    summary: "Mark all notifications as read",
    security: bearerAuth,
    responses: { 200: successResponse("All notifications marked as read") },
  }),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    await notificationService.markAllAsRead(supabaseAdmin, userId);
    return c.json({ success: true });
  }
);

export default notifications;
