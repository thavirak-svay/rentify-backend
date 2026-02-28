import { z } from "zod";

export const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  PAYWAY_MERCHANT_ID: z.string(),
  PAYWAY_API_KEY: z.string(),
  PAYWAY_MERCHANT_AUTH: z.string(),
  PAYWAY_BASE_URL: z.string().url(),
  PAYWAY_CALLBACK_URL: z.string().url(),
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export type Bindings = Env;

export function getEnv(c: { env: Env }): Env {
  const parsed = envSchema.safeParse(c.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error("Invalid environment variables", JSON.stringify(errors));
    throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
  }

  return parsed.data;
}
