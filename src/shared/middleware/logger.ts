import type { MiddlewareHandler } from 'hono';

type LogObject = Record<string, unknown>;

export const log = {
  info: (obj: LogObject, msg?: string) => {
    console.log(JSON.stringify({ level: 'info', msg, ...obj }));
  },
  warn: (obj: LogObject, msg?: string) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...obj }));
  },
  error: (obj: LogObject, msg?: string) => {
    console.error(JSON.stringify({ level: 'error', msg, ...obj }));
  },
};

export function structuredLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();

    c.set('requestId', requestId);
    c.header('x-request-id', requestId);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip');

    const entry = JSON.stringify({
      method: method,
      path: path,
      status: status,
      duration_ms: duration,
      request_id: requestId,
      ip: ip,
      user_agent: c.req.header('user-agent'),
      user_id: c.get('userId') as string | undefined,
    });

    if (status >= 500) {
      console.error(entry);
    } else if (status >= 400) {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  };
}
