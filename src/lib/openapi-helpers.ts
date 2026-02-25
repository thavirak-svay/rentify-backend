import { resolver } from "hono-openapi";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Response helpers — collapse 5 levels of nesting into one function call
// ---------------------------------------------------------------------------

/** Wrap a schema as `{ content: { "application/json": { schema } }, description }` */
export function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return {
    content: { "application/json": { schema: resolver(schema) } },
    description,
  };
}

/** Standard envelope: `{ data: <schema> }` */
export function dataResponse<T extends z.ZodType>(schema: T, description: string) {
  return jsonContent(z.object({ data: schema }), description);
}

/** Standard envelope for arrays: `{ data: [<schema>] }` */
export function dataArrayResponse<T extends z.ZodType>(schema: T, description: string) {
  return jsonContent(z.object({ data: z.array(schema) }), description);
}

/** `{ success: true }` response */
export function successResponse(description: string) {
  return jsonContent(z.object({ success: z.boolean() }), description);
}

// ---------------------------------------------------------------------------
// Common constants
// ---------------------------------------------------------------------------

/** Reusable Bearer auth for `security` field */
export const bearerAuth = [{ Bearer: [] as string[] }];

/** Reusable UUID path param */
export const uuidParam = z.object({ id: z.string().uuid() });
