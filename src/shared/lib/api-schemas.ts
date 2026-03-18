/**
 * Schema barrel — re-exports auto-generated supazod schemas with clean aliases,
 * plus API-only schemas that don't come from DB tables.
 *
 * Routes should import from here, never from db-schemas.ts directly.
 * db-schemas.ts is auto-generated — do NOT edit it.
 */

import { z } from 'zod';

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
  identity_status: z.union([z.literal('unverified'), z.literal('pending'), z.literal('verified'), z.literal('rejected')]),
  created_at: z.string(),
});

export const SearchListingSchema = publicSearchListingsReturnsSchema.element;

export const UploadUrlResponseSchema = z.object({
  upload_url: z.string().url(),
  path: z.string(),
  public_url: z.string().url(),
});
