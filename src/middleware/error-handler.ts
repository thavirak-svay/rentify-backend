import type { Context } from "hono";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { log } from "./logger";

export async function errorHandler(err: Error, c: Context) {
  const requestId = c.get("requestId") as string | undefined;

  log.error(
    { err, path: c.req.path, method: c.req.method, request_id: requestId },
    `Unhandled error: ${err.message}`
  );

  if (err instanceof ZodError) {
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

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          request_id: requestId,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 402 | 500
    );
  }

  const isProduction = c.env?.NODE_ENV === "production";

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: isProduction ? "An unexpected error occurred" : err.message,
        request_id: requestId,
        ...(isProduction ? {} : { stack: err.stack }),
      },
    },
    500
  );
}
