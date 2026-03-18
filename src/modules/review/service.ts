import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/lib/errors';
import type { Review } from '../../shared/types/database';

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
    if (input.rating < 1 || input.rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const { data: BOOKING, error: BOOKING_ERROR } = await supabaseAdmin.from('bookings').select().eq('id', input.booking_id).single();

    if (BOOKING_ERROR || !BOOKING) {
      throw new NotFoundError('Booking not found');
    }

    if (BOOKING.status !== 'completed') {
      throw new ValidationError('Can only review completed bookings');
    }

    if (BOOKING.renter_id !== reviewerId && BOOKING.owner_id !== reviewerId) {
      throw new ForbiddenError('You can only review bookings you participated in');
    }

    const TARGET_ID = BOOKING.renter_id === reviewerId ? BOOKING.owner_id : BOOKING.renter_id;

    // Prevent self-review
    if (TARGET_ID === reviewerId) {
      throw new ValidationError('You cannot review yourself');
    }

    const EXISTING_REVIEW = await findByBookingAndReviewer(input.booking_id, reviewerId);
    if (EXISTING_REVIEW) {
      throw new ValidationError('You have already reviewed this booking');
    }

    const { data: REVIEW, error: REVIEW_ERROR } = await supabaseAdmin
      .from('reviews')
      .insert({
        booking_id: input.booking_id,
        listing_id: BOOKING.listing_id,
        reviewer_id: reviewerId,
        target_id: TARGET_ID,
        rating: input.rating,
        comment: input.comment,
      })
      .select()
      .single();

    if (REVIEW_ERROR) {
      throw new DatabaseError(`Failed to create review: ${REVIEW_ERROR.message}`);
    }

    notifyReviewReceived(supabaseAdmin, TARGET_ID, reviewerId, REVIEW).catch((_err) => {
      // Notification failure is non-blocking
    });

    return REVIEW;
  }

  return {
    findByBookingAndReviewer,
    findByListing,
    findByTargetUser,
    create,
  };
}

async function notifyReviewReceived(supabaseAdmin: SupabaseClient, targetId: string, reviewerId: string, review: Review): Promise<void> {
  const { data: REVIEWER } = await supabaseAdmin.from('profiles').select('display_name').eq('id', reviewerId).single();

  await supabaseAdmin.from('notifications').insert({
    user_id: targetId,
    type: 'review.received',
    title: `New review from ${REVIEWER?.display_name || 'Someone'}`,
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
