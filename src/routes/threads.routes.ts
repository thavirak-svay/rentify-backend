import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as messageService from "../services/message.service";

const threads = new Hono();

const createThreadSchema = z.object({
  listing_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  participant_ids: z.array(z.string().uuid()).min(2),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const threadIdSchema = z.object({
  id: z.string().uuid(),
});

threads.post("/", requireAuth, zValidator("json", createThreadSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const thread = await messageService.createThread(supabaseAdmin, userId, input);

  return c.json({ data: thread }, 201);
});

threads.get("/", requireAuth, async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");

  const threads = await messageService.getUserThreads(supabaseAdmin, userId);

  return c.json({ data: threads });
});

threads.get("/:id", requireAuth, zValidator("param", threadIdSchema), async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const userId = c.get("userId");
  const { id } = c.req.valid("param");

  const thread = await messageService.getThread(supabaseAdmin, id, userId);

  return c.json({ data: thread });
});

threads.get(
  "/:id/messages",
  requireAuth,
  zValidator("param", threadIdSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;
    const before = c.req.query("before");

    const messages = await messageService.getMessages(supabaseAdmin, id, userId, limit, before);

    return c.json({ data: messages });
  }
);

threads.post(
  "/:id/messages",
  requireAuth,
  zValidator("param", threadIdSchema),
  zValidator("json", sendMessageSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const { content } = c.req.valid("json");

    const message = await messageService.sendMessage(supabaseAdmin, id, userId, content);

    return c.json({ data: message }, 201);
  }
);

threads.post(
  "/:id/read",
  requireAuth,
  zValidator("param", threadIdSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const userId = c.get("userId");
    const { id } = c.req.valid("param");

    await messageService.markMessagesAsRead(supabaseAdmin, id, userId);

    return c.json({ success: true });
  }
);

export default threads;