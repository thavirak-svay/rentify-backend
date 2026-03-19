import { z } from 'zod';
import { DEFAULT_MESSAGE_LIMIT } from '@/constants/message';
import { MAX_PAGE_LIMIT } from '@/constants/api';

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_MESSAGE_LIMIT),
  unread_only: z.coerce.boolean().default(false),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;