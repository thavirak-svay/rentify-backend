import { z } from 'zod';
import { IDENTITY_STATUS } from '@/constants/payment';

export {
  publicBookingsRowSchema as BookingSchema,
  publicCategoriesRowSchema as CategorySchema,
  publicListingMediaRowSchema as ListingMediaSchema,
  publicListingsRowSchema as ListingSchema,
  publicMessagesRowSchema as MessageSchema,
  publicMessageThreadsRowSchema as MessageThreadSchema,
  publicNotificationsRowSchema as NotificationSchema,
  publicProfilesRowSchema as ProfileSchema,
  publicReviewsRowSchema as ReviewSchema,
  publicSearchListingsReturnsSchema as SearchListingsResultSchema,
  publicTransactionsRowSchema as TransactionSchema,
} from './db-schemas';

import { publicListingMediaRowSchema, publicListingsRowSchema, publicSearchListingsReturnsSchema } from './db-schemas';

export const ListingWithMediaSchema = publicListingsRowSchema.extend({
  media: z.array(publicListingMediaRowSchema),
});

export const PublicProfileSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  rating_avg: z.number(),
  rating_count: z.number(),
  completed_rentals: z.number(),
  identity_status: z.enum(IDENTITY_STATUS),
  created_at: z.string(),
});

export const SearchListingSchema = publicSearchListingsReturnsSchema.element;

export const UploadUrlResponseSchema = z.object({
  upload_url: z.url(),
  path: z.string(),
  public_url: z.url(),
});
