import type { Context, MiddlewareHandler } from "hono";
import pino from "pino";

// ─── Pino instance ──────────────────────────────────────────────────────────
export const log = pino({
  level: "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientIP(c: Context): string | undefined {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip")
  );
}

// ─── HTTP request logging middleware ────────────────────────────────────────
export function structuredLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header("x-request-id") || crypto.randomUUID();

    c.set("requestId", requestId);
    c.header("x-request-id", requestId);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    const entry = {
      method,
      path,
      status,
      duration_ms: duration,
      request_id: requestId,
      ip: getClientIP(c),
      user_agent: c.req.header("user-agent"),
      user_id: c.get("userId") as string | undefined,
    };

    if (status >= 500) {
      log.error(entry, `${method} ${path} ${status}`);
    } else if (status >= 400) {
      log.warn(entry, `${method} ${path} ${status}`);
    } else {
      log.info(entry, `${method} ${path} ${status}`);
    }
  };
}

// ─── Error helper (for use in onError / catch blocks) ───────────────────────
export function logError(err: Error, c: Context, requestId?: string): void {
  log.error(
    {
      method: c.req.method,
      path: c.req.path,
      status: 500,
      request_id: requestId || c.get("requestId"),
      error: err.message,
      stack: err.stack,
      ip: getClientIP(c),
      user_agent: c.req.header("user-agent"),
      user_id: c.get("userId") as string | undefined,
    },
    `Error: ${err.message}`
  );
}
