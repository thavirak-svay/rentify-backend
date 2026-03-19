import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOKING_STATUS } from '@/constants/booking';
import { MAX_RATING, MIN_RATING } from '@/constants/review';
import { DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import type { Booking, Review } from '@/shared/types/database';

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewRepository {
  findByBookingAndReviewer(bookingId: string, reviewerId: string): Promise<Review | null>;
  findByListing(listingId: string): Promise<Review[]>;
  findByTargetUser(userId: string): Promise<Review[]>;
  create(input: CreateReviewInput, reviewerId: string): Promise<Review>;
}

async function validateBookingForReview(supabaseAdmin: SupabaseClient, bookingId: string, reviewerId: string): Promise<{ booking: Booking; targetId: string }> {
  const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (bookingError || !booking) {
    throw new NotFoundError('Booking not found');
  }

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

export function createReviewRepository(supabaseAdmin: SupabaseClient): ReviewRepository {
  async function findByBookingAndReviewer(bookingId: string, reviewerId: string): Promise<Review | null> {
    const { data } = await supabaseAdmin.from('reviews').select().eq('booking_id', bookingId).eq('reviewer_id', reviewerId).single();

    return data || null;
  }

  async function findByListing(listingId: string): Promise<Review[]> {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to get reviews: ${error.message}`);
    }

    return data || [];
  }

  async function findByTargetUser(userId: string): Promise<Review[]> {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
      .eq('target_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to get reviews: ${error.message}`);
    }

    return data || [];
  }

  async function create(input: CreateReviewInput, reviewerId: string): Promise<Review> {
    if (input.rating < MIN_RATING || input.rating > MAX_RATING) {
    throw new ValidationError(`Rating must be between ${MIN_RATING} and ${MAX_RATING}`);
  }

    const { booking, targetId } = await validateBookingForReview(supabaseAdmin, input.booking_id, reviewerId);

    const existingReview = await findByBookingAndReviewer(input.booking_id, reviewerId);
    if (existingReview) {
      throw new ValidationError('You have already reviewed this booking');
    }

    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        booking_id: input.booking_id,
        listing_id: booking.listing_id,
        reviewer_id: reviewerId,
        target_id: targetId,
        rating: input.rating,
        comment: input.comment,
      })
      .select()
      .single();

    if (reviewError) {
      throw new DatabaseError(`Failed to create review: ${reviewError.message}`);
    }

    notifyReviewReceived(supabaseAdmin, targetId, reviewerId, review).catch(() => {
      // Notification failure is non-blocking
    });

    return review;
  }

  return {
    findByBookingAndReviewer,
    findByListing,
    findByTargetUser,
    create,
  };
}

async function notifyReviewReceived(supabaseAdmin: SupabaseClient, targetId: string, reviewerId: string, review: Review): Promise<void> {
  const { data: reviewer } = await supabaseAdmin.from('profiles').select('display_name').eq('id', reviewerId).single();

  await supabaseAdmin.from('notifications').insert({
    user_id: targetId,
    type: 'review.received',
    title: `New review from ${reviewer?.display_name || 'Someone'}`,
    body: `Rating: ${'⭐'.repeat(review.rating)}`,
    data: { review_id: review.id, rating: review.rating },
  });
}

export async function createReview(supabaseAdmin: SupabaseClient, reviewerId: string, input: CreateReviewInput): Promise<Review> {
  return await createReviewRepository(supabaseAdmin).create(input, reviewerId);
}

export async function getListingReviews(supabaseAdmin: SupabaseClient, listingId: string): Promise<Review[]> {
  return await createReviewRepository(supabaseAdmin).findByListing(listingId);
}

export async function getUserReviews(supabaseAdmin: SupabaseClient, userId: string): Promise<Review[]> {
  return await createReviewRepository(supabaseAdmin).findByTargetUser(userId);
}