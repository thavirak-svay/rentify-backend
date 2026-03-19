import { z } from 'zod';
import { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LENGTH, MIN_THREAD_PARTICIPANTS } from '@/constants/message';
import { MAX_PAGE_LIMIT } from '@/constants/api';

export const createThreadSchema = z.object({
  listing_id: z.uuid().optional(),
  booking_id: z.uuid().optional(),
  participant_ids: z.array(z.uuid()).min(MIN_THREAD_PARTICIPANTS),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const messagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_MESSAGE_LIMIT),
  before: z.iso.datetime().optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessagesQueryInput = z.infer<typeof messagesQuerySchema>;