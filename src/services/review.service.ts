import type { SupabaseClient } from "@supabase/supabase-js";
import { ForbiddenError, NotFoundError, ValidationError } from "../lib/errors";
import { log } from "../middleware/logger";
import type { Review } from "../types/database";

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export async function createReview(
  supabaseAdmin: SupabaseClient,
  reviewerId: string,
  input: CreateReviewInput
): Promise<Review> {
  if (input.rating < 1 || input.rating > 5) {
    throw new ValidationError("Rating must be between 1 and 5");
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select()
    .eq("id", input.booking_id)
    .single();

  if (bookingError || !booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.status !== "completed") {
    throw new ValidationError("Can only review completed bookings");
  }

  if (booking.renter_id !== reviewerId && booking.owner_id !== reviewerId) {
    throw new ForbiddenError("You can only review bookings you participated in");
  }

  const targetId = booking.renter_id === reviewerId ? booking.owner_id : booking.renter_id;

  const { data: existingReview } = await supabaseAdmin
    .from("reviews")
    .select()
    .eq("booking_id", input.booking_id)
    .eq("reviewer_id", reviewerId)
    .single();

  if (existingReview) {
    throw new ValidationError("You have already reviewed this booking");
  }

  const { data: review, error: reviewError } = await supabaseAdmin
    .from("reviews")
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
    throw new Error(`Failed to create review: ${reviewError.message}`);
  }

  notifyReviewReceived(supabaseAdmin, targetId, reviewerId, review).catch((err) =>
    log.error({ err, reviewId: review.id }, "Failed to send review notification")
  );

  return review;
}

export async function getListingReviews(
  supabaseAdmin: SupabaseClient,
  listingId: string
): Promise<Review[]> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get reviews: ${error.message}`);
  }

  return data || [];
}

export async function getUserReviews(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<Review[]> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)")
    .eq("target_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get reviews: ${error.message}`);
  }

  return data || [];
}

async function notifyReviewReceived(
  supabaseAdmin: SupabaseClient,
  targetId: string,
  reviewerId: string,
  review: Review
): Promise<void> {
  const { data: reviewer } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", reviewerId)
    .single();

  await supabaseAdmin.from("notifications").insert({
    user_id: targetId,
    type: "review.received",
    title: `New review from ${reviewer?.display_name || "Someone"}`,
    body: `Rating: ${"⭐".repeat(review.rating)}`,
    data: { review_id: review.id, rating: review.rating },
  });
}
