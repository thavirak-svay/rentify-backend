import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../../config/env';
import { AppError } from '../lib/errors';
import type { Variables } from '../types/context';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const STORE: RateLimitStore = {};

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context<{ Bindings: Env; Variables: Variables }>) => string;
}) {
  return createMiddleware(async (c, next) => {
    const KEY = options.keyGenerator ? options.keyGenerator(c) : c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    const NOW = Date.now();
    const WINDOW_START = NOW - options.windowMs;

    Object.keys(STORE).forEach((k) => {
      if (STORE[k]?.resetTime && STORE[k].resetTime < WINDOW_START) {
        delete STORE[k];
      }
    });

    STORE[KEY] ??= {
      count: 0,
      resetTime: NOW + options.windowMs,
    };

    if (STORE[KEY].count >= options.maxRequests) {
      const RETRY_AFTER = Math.ceil((STORE[KEY].resetTime - NOW) / 1000);
      c.header('Retry-After', RETRY_AFTER.toString());
      throw new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
    }

    STORE[KEY].count++;

    c.header('X-RateLimit-Limit', options.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (options.maxRequests - STORE[KEY].count).toString());
    c.header('X-RateLimit-Reset', STORE[KEY].resetTime.toString());

    await next();
  });
}

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyGenerator: (c) => {
    const IP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const PATH = c.req.path;
    return `${IP}:${PATH}`;
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (c) => {
    const USER_ID = c.get('userId') || c.req.header('x-forwarded-for') || 'anonymous';
    return `api:${USER_ID}`;
  },
});

export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (c) => {
    const USER_ID = c.get('userId');
    if (!USER_ID) return 'anonymous';
    return `write:${USER_ID}`;
  },
});
