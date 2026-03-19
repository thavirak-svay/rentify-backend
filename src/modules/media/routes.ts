import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { UploadUrlResponseSchema } from '@/shared/lib/api-schemas';
import { AuthenticationError } from '@/shared/lib/errors';
import { bearerAuth, dataResponse, jsonContent, successResponse, uuidParam } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as mediaService from './service';
import { confirmUploadSchema, createUploadUrlSchema, listingIdParamSchema } from './validation';

const media = new Hono<{ Bindings: Env; Variables: Variables }>();

media.use('*', optionalAuth);

media.post(
  '/upload-url',
  describeRoute({
    tags: ['Media'],
    summary: 'Get signed upload URL',
    security: bearerAuth,
    responses: { 200: dataResponse(UploadUrlResponseSchema, 'Upload URL created') },
  }),
  validator('json', createUploadUrlSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const { file_name, content_type } = c.req.valid('json');
    const data = await mediaService.createUploadUrl(supabaseAdmin, userId, file_name, content_type);
    return c.json({ data: data });
  },
);

media.post(
  '/:listingId/confirm',
  describeRoute({
    tags: ['Media'],
    summary: 'Confirm media upload',
    security: bearerAuth,
    responses: {
      200: jsonContent(z.object({ data: z.object({ id: z.uuid(), url: z.url() }) }), 'Upload confirmed'),
    },
  }),
  validator('param', listingIdParamSchema),
  validator('json', confirmUploadSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const { listingId } = c.req.valid('param');
    const { path, is_primary } = c.req.valid('json');
    const data = await mediaService.confirmUpload(supabaseAdmin, userId, listingId, path, is_primary);
    return c.json({ data: data });
  },
);

media.delete(
  '/:id',
  describeRoute({
    tags: ['Media'],
    summary: 'Delete media',
    security: bearerAuth,
    responses: { 200: successResponse('Media deleted') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    await mediaService.deleteMedia(supabaseAdmin, userId, id);
    return c.json({ success: true });
  },
);

export default media;
