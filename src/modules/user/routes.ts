import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { ProfileSchema, PublicProfileSchema } from '../../shared/lib/api-schemas';
import { AuthenticationError } from '../../shared/lib/errors';
import { bearerAuth, dataResponse, uuidParam } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const DATA = await userService.getProfile(SUPABASE_ADMIN, USER_ID);
    userService.updateLastActive(SUPABASE_ADMIN, USER_ID).catch((_err) => {
      // Last active update is non-blocking
    });
    return c.json({ data: DATA });
  },
);

const UPDATE_PROFILE_SCHEMA = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  address_city: z.string().max(100).optional(),
  address_country: z.string().length(2).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account_masked: z.string().max(20).optional(),
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
  validator('json', UPDATE_PROFILE_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const USER_ID = c.get('userId');
    if (!USER_ID) throw new AuthenticationError();

    const INPUT = c.req.valid('json');
    const DATA = await userService.updateProfile(SUPABASE_ADMIN, USER_ID, INPUT);
    return c.json({ data: DATA });
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { id } = c.req.valid('param');
    const PROFILE = await userService.getPublicProfile(SUPABASE_ADMIN, id);
    return c.json({ data: PROFILE });
  },
);

export default users;
