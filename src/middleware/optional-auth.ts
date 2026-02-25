import type { Context, Next } from "hono";
import type { Env } from "../config/env";
import type { Variables } from "../types/variables";

/**
 * Optional auth middleware — extracts user from Bearer token if present.
 * Does NOT reject unauthenticated requests (use `requireAuth` for that).
 */
export async function optionalAuth(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = c.get("supabase");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) {
      c.set("user", user);
      c.set("userId", user.id);
    }
  }
  await next();
}
