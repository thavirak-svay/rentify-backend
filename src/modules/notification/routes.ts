import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { NotificationSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataArrayResponse, jsonContent, successResponse, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as notificationService from './service';

const notifications = new Hono<{ Bindings: Env; Variables: Variables }>();

notifications.use('*', optionalAuth);

notifications.get(
  '/',
  describeRoute({
    tags: ['Notifications'],
    summary: 'List user notifications',
    security: bearerAuth,
    responses: { 200: dataArrayResponse(NotificationSchema, 'List of notifications') },
  }),
  validator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      unread: z.enum(['true', 'false']).optional(),
    }),
  ),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { limit, unread } = c.req.valid('query');
    const DATA = await notificationService.getUserNotifications(SUPABASE_ADMIN, USER_ID, limit, unread === 'true');
    return c.json({ data: DATA });
  },
);

notifications.get(
  '/unread-count',
  describeRoute({
    tags: ['Notifications'],
    summary: 'Get unread notification count',
    security: bearerAuth,
    responses: {
      200: jsonContent(z.object({ data: z.object({ count: z.number() }) }), 'Unread count'),
    },
  }),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const COUNT = await notificationService.getUnreadCount(SUPABASE_ADMIN, USER_ID);
    return c.json({ data: { count: COUNT } });
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    await notificationService.markAsRead(SUPABASE_ADMIN, id, USER_ID);
    return c.json({ success: true });
  },
);

notifications.post(
  '/mark-all-read',
  describeRoute({
    tags: ['Notifications'],
    summary: 'Mark all notifications as read',
    security: bearerAuth,
    responses: { 200: successResponse('All notifications marked as read') },
  }),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    await notificationService.markAllAsRead(SUPABASE_ADMIN, USER_ID);
    return c.json({ success: true });
  },
);

export default notifications;
