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
    const START = Date.now();
    const PATH = c.req.path;
    const METHOD = c.req.method;
    const REQUEST_ID = c.req.header('x-request-id') || crypto.randomUUID();

    c.set('requestId', REQUEST_ID);
    c.header('x-request-id', REQUEST_ID);

    await next();

    const DURATION = Date.now() - START;
    const STATUS = c.res.status;

    const IP = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip');

    const ENTRY = JSON.stringify({
      method: METHOD,
      path: PATH,
      status: STATUS,
      duration_ms: DURATION,
      request_id: REQUEST_ID,
      ip: IP,
      user_agent: c.req.header('user-agent'),
      user_id: c.get('userId') as string | undefined,
    });

    if (STATUS >= 500) {
      console.error(ENTRY);
    } else if (STATUS >= 400) {
      console.warn(ENTRY);
    } else {
      console.log(ENTRY);
    }
  };
}
