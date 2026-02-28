import type { MiddlewareHandler } from "hono";

// ─── HTTP request logging middleware ────────────────────────────────────────
// Uses native console.* so Sentry's consoleLoggingIntegration picks them up.
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

    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip");

    const entry = JSON.stringify({
      method,
      path,
      status,
      duration_ms: duration,
      request_id: requestId,
      ip,
      user_agent: c.req.header("user-agent"),
      user_id: c.get("userId") as string | undefined,
    });

    if (status >= 500) {
      console.error(`${method} ${path} ${status}`, entry);
    } else if (status >= 400) {
      console.warn(`${method} ${path} ${status}`, entry);
    } else {
      console.log(`${method} ${path} ${status}`, entry);
    }
  };
}
