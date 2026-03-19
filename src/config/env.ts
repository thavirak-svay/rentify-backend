import { z } from 'zod';

export const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  PAYWAY_MERCHANT_ID: z.string(),
  PAYWAY_API_KEY: z.string(),
  PAYWAY_MERCHANT_AUTH: z.string(),
  PAYWAY_BASE_URL: z.url(),
  PAYWAY_CALLBACK_URL: z.url(),
  APP_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export type Bindings = Env;

export function getEnv(c: { env: Env }): Env {
  const parsed = envSchema.safeParse(c.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables: ${errors.join(', ')}`);
  }

  return parsed.data;
}
