import { z } from 'zod';
import { MAX_COMMENT_LENGTH, MAX_RATING, MIN_RATING } from '@/constants/review';

export const createReviewSchema = z.object({
  booking_id: z.uuid(),
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;