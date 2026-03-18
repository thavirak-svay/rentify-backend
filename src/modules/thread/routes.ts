import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { MessageSchema, MessageThreadSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataArrayResponse, dataResponse, successResponse, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as messageService from './service';

const threads = new Hono<{ Bindings: Env; Variables: Variables }>();

threads.use('*', optionalAuth);

const CREATE_THREAD_SCHEMA = z.object({
  listing_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  participant_ids: z.array(z.string().uuid()).min(2),
});

threads.post(
  '/',
  describeRoute({
    tags: ['Messages'],
    summary: 'Create a message thread',
    security: bearerAuth,
    responses: { 201: dataResponse(MessageThreadSchema, 'Thread created successfully') },
  }),
  validator('json', CREATE_THREAD_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const INPUT = c.req.valid('json');
    const DATA = await messageService.createThread(SUPABASE_ADMIN, USER_ID, INPUT);
    return c.json({ data: DATA }, 201);
  },
);

threads.get(
  '/',
  describeRoute({
    tags: ['Messages'],
    summary: "List user's message threads",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(MessageThreadSchema, 'List of threads') },
  }),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const DATA = await messageService.getUserThreads(SUPABASE_ADMIN, USER_ID);
    return c.json({ data: DATA });
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const DATA = await messageService.getThread(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ data: DATA });
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
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      before: z.string().datetime().optional(),
    }),
  ),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const { limit, before } = c.req.valid('query');
    const DATA = await messageService.getMessages(SUPABASE_ADMIN, id, USER_ID, limit, before);
    return c.json({ data: DATA });
  },
);

threads.post(
  '/:id/messages',
  describeRoute({
    tags: ['Messages'],
    summary: 'Send a message',
    security: bearerAuth,
    responses: { 201: dataResponse(MessageSchema, 'Message sent successfully') },
  }),
  validator('param', uuidParam),
  validator('json', z.object({ content: z.string().min(1).max(5000) })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    const { content } = c.req.valid('json');
    const DATA = await messageService.sendMessage(SUPABASE_ADMIN, id, USER_ID, content);
    return c.json({ data: DATA }, 201);
  },
);

threads.post(
  '/:id/read',
  describeRoute({
    tags: ['Messages'],
    summary: 'Mark thread messages as read',
    security: bearerAuth,
    responses: { 200: successResponse('Messages marked as read') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    await messageService.markMessagesAsRead(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ success: true });
  },
);

export default threads;
