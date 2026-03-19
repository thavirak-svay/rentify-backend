import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import type { Env } from '@/config/env';
import { MessageSchema, MessageThreadSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, dataArrayResponse, dataResponse, successResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as threadService from './service';
import { createThreadSchema, messagesQuerySchema, sendMessageSchema } from './validation';

const threads = new Hono<{ Bindings: Env; Variables: Variables }>();

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
  validator('query', messagesQuerySchema),
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