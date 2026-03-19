import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '@/config/env';
import { AuthenticationError } from '@/shared/lib/errors';
import type { Variables } from '@/shared/types/context';

/**
 * Required auth middleware — rejects requests without valid Bearer token.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new AuthenticationError('Missing auth token');
  }

  // Validate Bearer token format
  const bearerPattern = /^Bearer\s+(.+)$/i;
  const bearerMatch = bearerPattern.exec(authHeader);
  if (!bearerMatch) {
    throw new AuthenticationError('Invalid authorization header format. Expected: Bearer <token>');
  }

  const token = bearerMatch[1];
  const supabase = c.get('supabase');

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

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
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const bearerPattern = /^Bearer\s+(.+)$/i;
    const bearerMatch = bearerPattern.exec(authHeader);
    if (bearerMatch) {
      const token = bearerMatch[1];
      const supabase = c.get('supabase');
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
      }
    }
  }
  await next();
}
