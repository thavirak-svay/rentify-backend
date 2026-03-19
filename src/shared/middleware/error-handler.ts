import * as Sentry from '@sentry/cloudflare';
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { isAppError, RateLimitError } from '@/shared/lib/errors';
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

  const requestId = c.get('requestId') as string | undefined;

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          request_id: requestId,
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
    const responseBody: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    };

    if (err.details?.retryAfter) {
      responseBody.error = {
        ...(responseBody.error as object),
        retry_after: err.details.retryAfter,
      };
    }

    return c.json(responseBody, 429);
  }

  if (isAppError(err)) {
    const logData = {
      path: c.req.path,
      method: c.req.method,
      request_id: requestId,
      code: err.code,
    };

    if (err.statusCode >= 500) {
      log.error(logData, err.message);
    } else {
      log.warn(logData, err.message);
    }

    const responseBody: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    };

    if (err.details) {
      responseBody.error = { ...(responseBody.error as object), details: err.details };
    }

    return c.json(responseBody, err.statusCode as 400 | 401 | 403 | 404 | 409 | 402 | 500);
  }

  const isProduction = c.env?.NODE_ENV === 'production';

  const errorResponse: Record<string, unknown> = {
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
      request_id: requestId,
    },
  };

  if (!isProduction) {
    errorResponse.error = { ...(errorResponse.error as object), stack: err.stack };
  }

  return c.json(errorResponse, 500);
}
