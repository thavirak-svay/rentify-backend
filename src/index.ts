import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/cloudflare";
import { withSentry } from "@sentry/cloudflare";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPIRouteHandler } from "hono-openapi";
import type { Env } from "./config/env";
import { createSupabaseAdminClient, createSupabaseClient } from "./config/supabase";
import { errorHandler } from "./middleware/error-handler";
import { structuredLogger } from "./middleware/logger";
import { apiRateLimit } from "./middleware/rate-limit";
import bookingRoutes from "./routes/bookings.routes";
import categoryRoutes from "./routes/categories.routes";
import listingRoutes from "./routes/listings.routes";
import mediaRoutes from "./routes/media.routes";
import mockPaymentRoutes from "./routes/mock-payment.routes";
import notificationRoutes from "./routes/notifications.routes";
import paymentRoutes from "./routes/payments.routes";
import reviewRoutes from "./routes/reviews.routes";
import searchRoutes from "./routes/search.routes";
import threadRoutes from "./routes/threads.routes";
import userRoutes from "./routes/users.routes";
import type { Variables } from "./types/variables";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors());
app.use("*", structuredLogger());

app.use("*", async (c, next) => {
  c.set("env", c.env as Env);
  c.set("supabase", createSupabaseClient(c.env as Env));
  c.set("supabaseAdmin", createSupabaseAdminClient(c.env as Env));
  await next();
});

app.use("/v1/*", apiRateLimit);

app.onError(errorHandler);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.route("/v1/listings", listingRoutes);
app.route("/v1/search", searchRoutes);
app.route("/v1/media", mediaRoutes);
app.route("/v1/bookings", bookingRoutes);
app.route("/v1/payments", paymentRoutes);
app.route("/v1/threads", threadRoutes);
app.route("/v1/reviews", reviewRoutes);
app.route("/v1/notifications", notificationRoutes);
app.route("/v1/users", userRoutes);
app.route("/v1/categories", categoryRoutes);
app.route("/v1/payments/mock", mockPaymentRoutes);

app.get(
  "/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Rentify API",
        version: "1.0.0",
        description: "Cambodia-first rental marketplace API. All endpoints implemented in Hono.",
        contact: {
          name: "Rentify Support",
          email: "support@rentify.com",
        },
      },
      servers: [
        {
          url: "https://rentify-api.thaavirak.workers.dev",
          description: "Production",
        },
        {
          url: "http://localhost:8787",
          description: "Development",
        },
      ],
    },
  })
);

app.get(
  "/docs",
  Scalar({
    url: "/openapi.json",
    theme: "purple",
    pageTitle: "Rentify API Reference",
  })
);

export default withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: "production",
    integrations: [
      Sentry.honoIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    enableLogs: true,
  }),
  { fetch: app.fetch }
);
