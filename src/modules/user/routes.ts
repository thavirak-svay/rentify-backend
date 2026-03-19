import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import {
  COUNTRY_CODE_LENGTH,
  MAX_BANK_ACCOUNT_LENGTH,
  MAX_BIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from '@/constants/user';
import { ProfileSchema, PublicProfileSchema } from '@/shared/lib/api-schemas';
import { AuthenticationError } from '@/shared/lib/errors';
import { bearerAuth, dataResponse, uuidParam } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as userService from './service';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

users.use('*', optionalAuth);

users.get(
  '/me',
  describeRoute({
    tags: ['Users'],
    summary: 'Get current user profile',
    security: bearerAuth,
    responses: { 200: dataResponse(ProfileSchema, 'Current user profile') },
  }),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const data = await userService.getProfile(supabaseAdmin, userId);
    userService.updateLastActive(supabaseAdmin, userId).catch(() => {
      // Fire-and-forget: ignore errors updating last active timestamp
    });
    return c.json({ data: data });
  },
);

const updateProfileSchema = z.object({
  display_name: z.string().min(MIN_DISPLAY_NAME_LENGTH).max(MAX_DISPLAY_NAME_LENGTH).optional(),
  avatar_url: z.url().optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  address_city: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  address_country: z.string().length(COUNTRY_CODE_LENGTH).optional(),
  bank_name: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  bank_account_masked: z.string().max(MAX_BANK_ACCOUNT_LENGTH).optional(),
  payway_beneficiary_id: z.string().optional(),
});

users.patch(
  '/me',
  describeRoute({
    tags: ['Users'],
    summary: 'Update current user profile',
    security: bearerAuth,
    responses: { 200: dataResponse(ProfileSchema, 'Updated profile') },
  }),
  validator('json', updateProfileSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const userId = c.get('userId');
    if (!userId) throw new AuthenticationError();

    const input = c.req.valid('json');
    const data = await userService.updateProfile(supabaseAdmin, userId, input);
    return c.json({ data: data });
  },
);

users.get(
  '/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Get public user profile',
    responses: { 200: dataResponse(PublicProfileSchema, 'Public user profile') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { id } = c.req.valid('param');
    const profile = await userService.getPublicProfile(supabaseAdmin, id);
    return c.json({ data: profile });
  },
);

export default users;
