import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '@/config/env';
import {
  API_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  SECONDS_PER_MINUTE,
  WRITE_RATE_LIMIT_MAX,
} from '@/constants/api';
import { AppError } from '@/shared/lib/errors';
import type { Variables } from '@/shared/types/context';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context<{ Bindings: Env; Variables: Variables }>) => string;
}) {
  return createMiddleware(async (c, next) => {
    const key = options.keyGenerator ? options.keyGenerator(c) : c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    const now = Date.now();
    const windowStart = now - options.windowMs;

    Object.keys(store).forEach((k) => {
      if (store[k]?.resetTime && store[k].resetTime < windowStart) {
        delete store[k];
      }
    });

    store[key] ??= {
      count: 0,
      resetTime: now + options.windowMs,
    };

    if (store[key].count >= options.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / SECONDS_PER_MINUTE);
      c.header('Retry-After', retryAfter.toString());
      throw new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
    }

    store[key].count++;

    c.header('X-RateLimit-Limit', options.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (options.maxRequests - store[key].count).toString());
    c.header('X-RateLimit-Reset', store[key].resetTime.toString());

    await next();
  });
}

export const authRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: AUTH_RATE_LIMIT_MAX,
  keyGenerator: (c) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const path = c.req.path;
    return `${ip}:${path}`;
  },
});

export const apiRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: API_RATE_LIMIT_MAX,
  keyGenerator: (c) => {
    const userId = c.get('userId') || c.req.header('x-forwarded-for') || 'anonymous';
    return `api:${userId}`;
  },
});

export const writeRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: WRITE_RATE_LIMIT_MAX,
  keyGenerator: (c) => {
    const userId = c.get('userId');
    if (!userId) return 'anonymous';
    return `write:${userId}`;
  },
});
