import { resolver } from 'hono-openapi';
import { z } from 'zod';

export function jsonContent<T extends z.ZodType>(schema: T, description: string) {
  return {
    content: { 'application/json': { schema: resolver(schema) } },
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

export const bearerAuth = [{ Bearer: [] as string[] }];

export const uuidParam = z.object({ id: z.string().uuid() });

/** Create a data response factory for a specific schema (DRY helper) */
export function createDataResponseFactory<T extends z.ZodType>(schema: T) {
  return (description: string) => dataResponse(schema, description);
}
