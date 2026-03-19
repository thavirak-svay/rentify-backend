import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOKING_STATUS } from '@/constants/booking';
import { MAX_RATING, MIN_RATING } from '@/constants/review';
import { fetchMany, fetchOne, insertOne } from '@/shared/lib/db-helpers';
import { ForbiddenError, ValidationError } from '@/shared/lib/errors';
import { notifyNewReview } from '@/shared/services/notification';
import type { Booking, Review } from '@/shared/types/database';

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

async function validateBookingForReview(
  supabase: SupabaseClient,
  bookingId: string,
  reviewerId: string,
): Promise<{ booking: Booking; targetId: string }> {
  const booking = await fetchOne<Booking>(supabase, 'bookings', { id: bookingId }, 'Booking');

  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw new ValidationError('Can only review completed bookings');
  }

  if (booking.renter_id !== reviewerId && booking.owner_id !== reviewerId) {
    throw new ForbiddenError('You can only review bookings you participated in');
  }

  const targetId = booking.renter_id === reviewerId ? booking.owner_id : booking.renter_id;

  if (targetId === reviewerId) {
    throw new ValidationError('You cannot review yourself');
  }

  return { booking, targetId };
}

export async function createReview(
  supabase: SupabaseClient,
  reviewerId: string,
  input: CreateReviewInput,
): Promise<Review> {
  if (input.rating < MIN_RATING || input.rating > MAX_RATING) {
    throw new ValidationError(`Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
  }

  const { booking, targetId } = await validateBookingForReview(supabase, input.booking_id, reviewerId);

  // Check for existing review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select()
    .eq('booking_id', input.booking_id)
    .eq('reviewer_id', reviewerId)
    .single();

  if (existingReview) {
    throw new ValidationError('You have already reviewed this booking');
  }

  const review = await insertOne<Review>(
    supabase,
    'reviews',
    {
      booking_id: input.booking_id,
      listing_id: booking.listing_id,
      reviewer_id: reviewerId,
      target_id: targetId,
      rating: input.rating,
      comment: input.comment,
    },
    'Review',
  );

  // Notify target (non-blocking)
  notifyNewReview(supabase, {
    targetId,
    reviewerId,
    reviewId: review.id,
    rating: review.rating,
  }).catch(() => {});

  return review;
}

export async function getListingReviews(supabase: SupabaseClient, listingId: string): Promise<Review[]> {
  return fetchMany<Review>(supabase, 'reviews', {
    column: 'listing_id',
    value: listingId,
    orderBy: { column: 'created_at', ascending: false },
  });
}

export async function getUserReviews(supabase: SupabaseClient, userId: string): Promise<Review[]> {
  return fetchMany<Review>(supabase, 'reviews', {
    column: 'target_id',
    value: userId,
    orderBy: { column: 'created_at', ascending: false },
  });
}