import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { DEFAULT_MESSAGE_LIMIT } from '@/constants/message';
import { MAX_PAGE_LIMIT } from '@/constants/api';
import { NotificationSchema } from '@/shared/lib/api-schemas';
import { bearerAuth, dataArrayResponse, jsonContent, successResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext } from '@/shared/lib/route-context';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as notificationService from './service';

const notifications = new Hono<{ Bindings: Env; Variables: Variables }>();

notifications.use('*', optionalAuth);

notifications.get(
  '/',
  describeRoute({
    tags: ['Notifications'],
    summary: "Get user's notifications",
    security: bearerAuth,
    responses: { 200: dataArrayResponse(NotificationSchema, 'List of notifications') },
  }),
  validator(
    'query',
    z.object({
      limit: z.coerce.number().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_MESSAGE_LIMIT),
      unread_only: z.coerce.boolean().default(false),
    }),
  ),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { limit, unread_only } = c.req.valid('query');
    const data = await notificationService.getUserNotifications(supabase, userId, limit, unread_only);
    return c.json({ data });
  },
);

notifications.get(
  '/unread-count',
  describeRoute({
    tags: ['Notifications'],
    summary: 'Get unread notification count',
    security: bearerAuth,
    responses: {
      200: jsonContent(z.object({ count: z.number() }), 'Unread count'),
    },
  }),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const count = await notificationService.getUnreadCount(supabase, userId);
    return c.json({ count });
  },
);

notifications.post(
  '/:id/read',
  describeRoute({
    tags: ['Notifications'],
    summary: 'Mark notification as read',
    security: bearerAuth,
    responses: { 200: successResponse('Notification marked as read') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const { id } = c.req.valid('param');
    await notificationService.markAsRead(supabase, id, userId);
    return c.json({ success: true });
  },
);

notifications.post(
  '/read-all',
  describeRoute({
    tags: ['Notifications'],
    summary: 'Mark all notifications as read',
    security: bearerAuth,
    responses: { 200: successResponse('All notifications marked as read') },
  }),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    await notificationService.markAllAsRead(supabase, userId);
    return c.json({ success: true });
  },
);

export default notifications;