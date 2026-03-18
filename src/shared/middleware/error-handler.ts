import * as Sentry from '@sentry/cloudflare';
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { isAppError, RateLimitError } from '../lib/errors';
import { log } from './logger';

export function errorHandler(err: Error, c: Context) {
  Sentry.captureException(err, {
    tags: {
      path: c.req.path,
      method: c.req.method,
    },
    extra: {
      requestId: c.get('requestId'),
    },
  });

  const REQUEST_ID = c.get('requestId') as string | undefined;

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          request_id: REQUEST_ID,
          details: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      400,
    );
  }

  if (err instanceof RateLimitError) {
    const RESPONSE_BODY: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        request_id: REQUEST_ID,
      },
    };

    if (err.details?.retryAfter) {
      RESPONSE_BODY.error = {
        ...(RESPONSE_BODY.error as object),
        retry_after: err.details.retryAfter,
      };
    }

    return c.json(RESPONSE_BODY, 429);
  }

  if (isAppError(err)) {
    const LOG_DATA = {
      path: c.req.path,
      method: c.req.method,
      request_id: REQUEST_ID,
      code: err.code,
    };

    if (err.statusCode >= 500) {
      log.error(LOG_DATA, err.message);
    } else {
      log.warn(LOG_DATA, err.message);
    }

    const RESPONSE_BODY: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        request_id: REQUEST_ID,
      },
    };

    if (err.details) {
      RESPONSE_BODY.error = { ...(RESPONSE_BODY.error as object), details: err.details };
    }

    return c.json(RESPONSE_BODY, err.statusCode as 400 | 401 | 403 | 404 | 409 | 402 | 500);
  }

  const IS_PRODUCTION = c.env?.NODE_ENV === 'production';

  const ERROR_RESPONSE: Record<string, unknown> = {
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
      request_id: REQUEST_ID,
    },
  };

  if (!IS_PRODUCTION) {
    ERROR_RESPONSE.error = { ...(ERROR_RESPONSE.error as object), stack: err.stack };
  }

  return c.json(ERROR_RESPONSE, 500);
}
