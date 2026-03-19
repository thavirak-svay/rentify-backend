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
import { bearerAuth, dataResponse, uuidParam } from '@/shared/lib/openapi';
import { getAuthContext, getContext } from '@/shared/lib/route-context';
import type { Variables } from '@/shared/types/context';
import * as userService from './service';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

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

users.get(
  '/me',
  describeRoute({
    tags: ['Users'],
    summary: 'Get current user profile',
    security: bearerAuth,
    responses: { 200: dataResponse(ProfileSchema, 'User profile') },
  }),
  async (c) => {
    const { supabase, userId } = getAuthContext(c);
    const data = await userService.getProfile(supabase, userId);
    return c.json({ data });
  },
);

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
    const { supabase, userId } = getAuthContext(c);
    const input = c.req.valid('json');
    const data = await userService.updateProfile(supabase, userId, input);
    return c.json({ data });
  },
);

users.get(
  '/:id',
  describeRoute({
    tags: ['Users'],
    summary: 'Get public profile by ID',
    responses: { 200: dataResponse(PublicProfileSchema, 'Public profile') },
  }),
  validator('param', uuidParam),
  async (c) => {
    const { supabase } = getContext(c);
    const { id } = c.req.valid('param');
    const data = await userService.getPublicProfile(supabase, id);
    return c.json({ data });
  },
);

export default users;