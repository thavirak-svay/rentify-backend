import type { Env } from "../config/env";
import type { createSupabaseAdminClient, createSupabaseClient } from "../config/supabase";

export type Variables = {
  env: Env;
  supabase: ReturnType<typeof createSupabaseClient>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  userId?: string;
  user?: { id: string };
};
