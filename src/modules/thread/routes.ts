import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LENGTH, MIN_THREAD_PARTICIPANTS } from '@/constants/message';
import { MAX_PAGE_LIMIT } from '@/constants/api';
import { MessageSchema, MessageThreadSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, dataArrayResponse, dataResponse, successResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as threadService from './service';

const threads = new Hono<{ Bindings: Env; Variables: Variables }>();

const createThreadSchema = z.object({
  listing_id: z.uuid().optional(),
  booking_id: z.uuid().optional(),
  participant_ids: z.array(z.uuid()).min(MIN_THREAD_PARTICIPANTS),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

threads.use('*', optionalAuth);

threads.post(
  '/',
  describeRoute({
    tags: ['Messages'],
    summary: 'Create a new message thread',
    security: bearerAuth,
    responses: { 201: dataResponse(MessageThreadSchema, 'Thread created') },
  }),
  validator('json', createThreadSchema),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const input = c.req.valid('json');
    const data = await threadService.createThread(supabase, userId, input);
    return c.json({ data }, 201);
  },
);

threads.get(
  '/',
  describeRoute({
    tags: ['Messages'],
    summary: "Get user's threads",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(MessageThreadSchema, 'List of threads') },
  }),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const data = await threadService.getUserThreads(supabase, userId);
    return c.json({ data });
  },
);

threads.get(
  '/:id',
  describeRoute({
    tags: ['Messages'],
    summary: 'Get thread by ID',
    security: bearerAuth,
    responses: { 200: dataResponse(MessageThreadSchema, 'Thread details') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const data = await threadService.getThread(supabase, id, userId);
    return c.json({ data });
  },
);

threads.get(
  '/:id/messages',
  describeRoute({
    tags: ['Messages'],
    summary: 'Get messages in a thread',
    security: bearerAuth,
    responses: { 200: dataArrayResponse(MessageSchema, 'List of messages') },
  }),
  validator('param', uuidParam),
  validator(
    'query',
    z.object({
      limit: z.coerce.number().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_MESSAGE_LIMIT),
      before: z.iso.datetime().optional(),
    }),
  ),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const { limit, before } = c.req.valid('query');
    const data = await threadService.getMessages(supabase, id, userId, limit, before);
    return c.json({ data });
  },
);

threads.post(
  '/:id/messages',
  describeRoute({
    tags: ['Messages'],
    summary: 'Send a message in a thread',
    security: bearerAuth,
    responses: { 201: dataResponse(MessageSchema, 'Message sent') },
  }),
  validator('param', uuidParam),
  validator('json', sendMessageSchema),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    const { content } = c.req.valid('json');
    const data = await threadService.sendMessage(supabase, id, userId, content);
    return c.json({ data }, 201);
  },
);

threads.post(
  '/:id/read',
  describeRoute({
    tags: ['Messages'],
    summary: 'Mark messages as read',
    security: bearerAuth,
    responses: { 200: successResponse('Messages marked as read') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    await threadService.markMessagesAsRead(supabase, id, userId);
    return c.json({ success: true });
  },
);

export default threads;