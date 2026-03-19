import { z } from 'zod';

export const createUploadUrlSchema = z.object({
  file_name: z.string(),
  content_type: z.string().optional(),
});

export const confirmUploadSchema = z.object({
  path: z.string(),
  is_primary: z.boolean().optional(),
});

export const listingIdParamSchema = z.object({
  listingId: z.uuid(),
});

export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;