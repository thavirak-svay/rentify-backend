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
import { MessageSchema, MessageThreadSchema } from "../lib/schemas";
import { optionalAuth } from "../middleware/optional-auth";
import * as messageService from "../services/message.service";
import type { Variables } from "../types/variables";

const threads = new Hono<{ Bindings: Env; Variables: Variables }>();

threads.use("*", optionalAuth);

const CreateThreadSchema = z.object({
  listing_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  participant_ids: z.array(z.string().uuid()).min(2),
});

threads.post(
  "/",
  describeRoute({
    tags: ["Messages"],
    summary: "Create a message thread",
    security: bearerAuth,
    responses: { 201: dataResponse(MessageThreadSchema, "Thread created successfully") },
  }),
  validator("json", CreateThreadSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const input = c.req.valid("json");
    const data = await messageService.createThread(supabaseAdmin, userId, input);
    return c.json({ data }, 201);
  }
);

threads.get(
  "/",
  describeRoute({
    tags: ["Messages"],
    summary: "List user's message threads",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(MessageThreadSchema, "List of threads") },
  }),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const data = await messageService.getUserThreads(supabaseAdmin, userId);
    return c.json({ data });
  }
);

threads.get(
  "/:id",
  describeRoute({
    tags: ["Messages"],
    summary: "Get thread by ID",
    security: bearerAuth,
    responses: { 200: dataResponse(MessageThreadSchema, "Thread details") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const data = await messageService.getThread(supabaseAdmin, id, userId);
    return c.json({ data });
  }
);

threads.get(
  "/:id/messages",
  describeRoute({
    tags: ["Messages"],
    summary: "Get messages in a thread",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(MessageSchema, "List of messages") },
  }),
  validator("param", uuidParam),
  validator(
    "query",
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      before: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const { limit, before } = c.req.valid("query");
    const data = await messageService.getMessages(supabaseAdmin, id, userId, limit, before);
    return c.json({ data });
  }
);

threads.post(
  "/:id/messages",
  describeRoute({
    tags: ["Messages"],
    summary: "Send a message",
    security: bearerAuth,
    responses: { 201: dataResponse(MessageSchema, "Message sent successfully") },
  }),
  validator("param", uuidParam),
  validator("json", z.object({ content: z.string().min(1).max(5000) })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    const { content } = c.req.valid("json");
    const data = await messageService.sendMessage(supabaseAdmin, id, userId, content);
    return c.json({ data }, 201);
  }
);

threads.post(
  "/:id/read",
  describeRoute({
    tags: ["Messages"],
    summary: "Mark thread messages as read",
    security: bearerAuth,
    responses: { 200: successResponse("Messages marked as read") },
  }),
  validator("param", uuidParam),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    if (!userId) throw new Error("Authentication required");

    const { id } = c.req.valid("param");
    await messageService.markMessagesAsRead(supabaseAdmin, id, userId);
    return c.json({ success: true });
  }
);

export default threads;
