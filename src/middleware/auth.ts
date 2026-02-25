import { createMiddleware } from "hono/factory";
import { AuthenticationError } from "../lib/errors";

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    throw new AuthenticationError("Missing auth token");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = c.get("supabase");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthenticationError("Invalid or expired token");
  }

  c.set("user", user);
  c.set("userId", user.id);

  await next();
});
