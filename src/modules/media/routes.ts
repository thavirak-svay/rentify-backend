import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { UploadUrlResponseSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataResponse, jsonContent, successResponse, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as mediaService from './service';

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
  validator('json', z.object({ file_name: z.string(), content_type: z.string().optional() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { file_name, content_type } = c.req.valid('json');
    const DATA = await mediaService.createUploadUrl(SUPABASE_ADMIN, USER_ID, file_name, content_type);
    return c.json({ data: DATA });
  },
);

media.post(
  '/:listingId/confirm',
  describeRoute({
    tags: ['Media'],
    summary: 'Confirm media upload',
    security: bearerAuth,
    responses: {
      200: jsonContent(z.object({ data: z.object({ id: z.string().uuid(), url: z.string().url() }) }), 'Upload confirmed'),
    },
  }),
  validator('param', z.object({ listingId: z.string().uuid() })),
  validator('json', z.object({ path: z.string(), is_primary: z.boolean().optional() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { listingId } = c.req.valid('param');
    const { path, is_primary } = c.req.valid('json');
    const DATA = await mediaService.confirmUpload(SUPABASE_ADMIN, USER_ID, listingId, path, is_primary);
    return c.json({ data: DATA });
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const { id } = c.req.valid('param');
    await mediaService.deleteMedia(SUPABASE_ADMIN, USER_ID, id);
    return c.json({ success: true });
  },
);

export default media;
