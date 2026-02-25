import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createSupabaseClient, createSupabaseAdminClient, type Env } from "./config/supabase";
import { getEnv } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { apiRateLimit } from "./middleware/rate-limit";
import listingRoutes from "./routes/listings.routes";
import searchRoutes from "./routes/search.routes";
import mediaRoutes from "./routes/media.routes";
import bookingRoutes from "./routes/bookings.routes";
import paymentRoutes from "./routes/payments.routes";
import threadRoutes from "./routes/threads.routes";
import reviewRoutes from "./routes/reviews.routes";
import notificationRoutes from "./routes/notifications.routes";
import userRoutes from "./routes/users.routes";
import categoryRoutes from "./routes/categories.routes";
import openApiRoutes from "./routes/openapi.routes";

type Variables = {
  env: Env;
  supabase: ReturnType<typeof createSupabaseClient>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors());
app.use("*", logger());

app.use("*", async (c, next) => {
  const env = getEnv(c);
  c.set("env", env);
  c.set("supabase", createSupabaseClient(env));
  c.set("supabaseAdmin", createSupabaseAdminClient(env));
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

app.route("/", openApiRoutes);
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

export default app;