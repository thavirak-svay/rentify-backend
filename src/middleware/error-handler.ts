import * as Sentry from "@sentry/cloudflare";
import type { Context } from "hono";
import { ZodError } from "zod";
import { isAppError, RateLimitError } from "../lib/errors";

export async function errorHandler(err: Error, c: Context) {
  Sentry.captureException(err, {
    tags: {
      path: c.req.path,
      method: c.req.method,
    },
    extra: {
      requestId: c.get("requestId"),
    },
  });

  const requestId = c.get("requestId") as string | undefined;

  if (err instanceof ZodError) {
    console.warn(
      "Validation error",
      JSON.stringify({
        path: c.req.path,
        method: c.req.method,
        request_id: requestId,
        issues: err.issues,
      })
    );

    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          request_id: requestId,
          details: err.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      },
      400
    );
  }

  if (err instanceof RateLimitError) {
    console.warn(
      "Rate limit exceeded",
      JSON.stringify({
        path: c.req.path,
        method: c.req.method,
        request_id: requestId,
        retryAfter: err.details?.retryAfter,
      })
    );

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
    const logFn = err.statusCode >= 500 ? console.error : console.warn;
    logFn(
      `Application error: ${err.message}`,
      JSON.stringify({
        path: c.req.path,
        method: c.req.method,
        request_id: requestId,
        code: err.code,
      })
    );

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

  const isProduction = c.env?.NODE_ENV === "production";

  console.error(
    `Unhandled error: ${err.message}`,
    JSON.stringify({
      path: c.req.path,
      method: c.req.method,
      request_id: requestId,
      stack: err.stack,
    })
  );

  const errorResponse: Record<string, unknown> = {
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "An unexpected error occurred" : err.message,
      request_id: requestId,
    },
  };

  if (!isProduction) {
    errorResponse.error = { ...(errorResponse.error as object), stack: err.stack };
  }

  return c.json(errorResponse, 500);
}
