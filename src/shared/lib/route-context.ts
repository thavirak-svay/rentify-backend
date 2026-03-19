import type { Context } from 'hono';
import type { Env } from '@/config/env';
import { AuthenticationError } from './errors';
import type { Variables } from '@/shared/types/context';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  supabase: SupabaseClient;
  env: Env;
  userId: string;
}

export interface OptionalAuthContext {
  supabase: SupabaseClient;
  env: Env;
  userId?: string;
}

/**
 * Get authenticated context from route handler.
 * Throws AuthenticationError if user is not authenticated.
 */
export function getAuthContext(c: Context<{ Bindings: Env; Variables: Variables }>): AuthContext {
  const supabase = c.get('supabaseAdmin');
  const env = c.get('env');
  const userId = c.get('userId');

  if (!userId) throw new AuthenticationError();

  return { supabase, env, userId };
}

/**
 * Get optional context from route handler.
 * userId will be undefined if not authenticated.
 */
export function getContext(c: Context<{ Bindings: Env; Variables: Variables }>): OptionalAuthContext {
  return {
    supabase: c.get('supabaseAdmin'),
    env: c.get('env'),
    userId: c.get('userId'),
  };
}