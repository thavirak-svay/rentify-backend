/**
 * Auth Middleware
 * Authentication middlewares for Supabase JWT tokens
 */

import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../../config/env';
import { AuthenticationError } from '../lib/errors';
import type { Variables } from '../types/context';

/**
 * Required auth middleware — rejects requests without valid Bearer token.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const AUTH_HEADER = c.req.header('Authorization');

  if (!AUTH_HEADER) {
    throw new AuthenticationError('Missing auth token');
  }

  // Validate Bearer token format
  const BEARER_PATTERN = /^Bearer\s+(.+)$/i;
  const BEARER_MATCH = BEARER_PATTERN.exec(AUTH_HEADER);
  if (!BEARER_MATCH) {
    throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
  }

  const TOKEN = BEARER_MATCH[1];
  const SUPABASE = c.get('supabase');

  const {
    data: { user },
    error,
  } = await SUPABASE.auth.getUser(TOKEN);

  if (error || !user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  c.set('user', user);
  c.set('userId', user.id);

  await next();
});

/**
 * Optional auth middleware — extracts user from Bearer token if present.
 * Does NOT reject unauthenticated requests.
 */
export async function optionalAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const AUTH_HEADER = c.req.header('Authorization');
  if (AUTH_HEADER) {
    const BEARER_PATTERN = /^Bearer\s+(.+)$/i;
    const BEARER_MATCH = BEARER_PATTERN.exec(AUTH_HEADER);
    if (BEARER_MATCH) {
      const TOKEN = BEARER_MATCH[1];
      const SUPABASE = c.get('supabase');
      const {
        data: { user },
      } = await SUPABASE.auth.getUser(TOKEN);
      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
      }
    }
  }
  await next();
}
