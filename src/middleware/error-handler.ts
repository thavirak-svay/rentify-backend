import type { Context } from "hono";
import { AppError } from "../lib/errors";

export async function errorHandler(err: Error, c: Context) {
  console.error("Error:", err);

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
        },
      },
      err.statusCode
    );
  }

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500
  );
}
