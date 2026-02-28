import * as Sentry from "@sentry/cloudflare";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});
