import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '@/config/env';
import {
  BOOKING_STATUS,
  DELIVERY_METHOD,
  type DeliveryMethodType,
  LISTING_STATUS,
  PROTECTION_PLAN,
  type ProtectionPlanType,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@/constants';
import { queueCompensation } from '@/modules/compensation';
import { cancelPreAuth, captureWithPayout, createPreAuth, type PayWayBooking, refundPayment } from '@/modules/mock';
import { calculatePricing, type PricingInput } from '@/modules/pricing';
import { ConflictError, DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { log } from '@/shared/middleware/logger';
import type { Booking, Profile } from '@/shared/types/database';
import { validateTransition } from './state-machine';

export interface CreateBookingInput {
  listing_id: string;
  start_time: string;
  end_time: string;
  delivery_method?: DeliveryMethodType;
  delivery_address?: string;
  protection_plan?: ProtectionPlanType;
}

interface ListingWithOwner {
  id: string;
  owner_id: string;
  title: string;
  currency: string;
  price_hourly: number | null;
  price_daily: number | null;
  price_weekly: number | null;
  deposit_amount: number;
  delivery_available: boolean;
  delivery_fee: number | null;
  profiles: Profile | null;
}

async function fetchListingWithOwner(supabaseAdmin: SupabaseClient, listingId: string): Promise<ListingWithOwner> {
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*, profiles!listings_owner_id_fkey(*)')
    .eq('id', listingId)
    .eq('status', LISTING_STATUS.ACTIVE)
    .is('deleted_at', null)
    .single();

  if (error || !listing) {
    throw new NotFoundError('Listing not found or not available');
  }

  const owner = listing.profiles as Profile | null;
  if (!owner) {
    throw new NotFoundError('Listing owner not found');
  }

  return listing as ListingWithOwner;
}

async function checkBookingConflicts(supabaseAdmin: SupabaseClient, listingId: string, startTime: string, endTime: string): Promise<void> {
  const { data: conflicts } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('listing_id', listingId)
    .in('status', [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.ACTIVE])
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

  if (conflicts && conflicts.length > 0) {
    throw new ConflictError('Listing is not available for the selected dates');
  }
}

function buildPricingInput(listing: ListingWithOwner, input: CreateBookingInput): PricingInput {
  return {
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceHourly: listing.price_hourly,
    priceDaily: listing.price_daily,
    priceWeekly: listing.price_weekly,
    depositAmount: listing.deposit_amount,
    deliveryMethod: input.delivery_method || DELIVERY_METHOD.PICKUP,
    deliveryFee: listing.delivery_available && input.delivery_method === DELIVERY_METHOD.DELIVERY ? (listing.delivery_fee ?? 0) : 0,
    protectionPlan: input.protection_plan || PROTECTION_PLAN.NONE,
    serviceFeeRate: 0.12,
  };
}

async function createBookingRecord(
  supabaseAdmin: SupabaseClient,
  renterId: string,
  listing: ListingWithOwner,
  input: CreateBookingInput,
  pricing: ReturnType<typeof calculatePricing>,
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      listing_id: input.listing_id,
      renter_id: renterId,
      owner_id: listing.owner_id,
      start_time: input.start_time,
      end_time: input.end_time,
      status: BOOKING_STATUS.REQUESTED,
      subtotal: pricing.subtotal,
      service_fee: pricing.service_fee,
      delivery_fee: pricing.delivery_fee,
      protection_fee: pricing.protection_fee,
      deposit_amount: pricing.deposit_amount,
      total_amount: pricing.total_renter_pays,
      owner_payout: pricing.owner_payout,
      currency: listing.currency,
      delivery_method: input.delivery_method || DELIVERY_METHOD.PICKUP,
      delivery_address: input.delivery_address,
      protection_plan: input.protection_plan || PROTECTION_PLAN.NONE,
      payment_authorized: false,
    })
    .select()
    .single();

  if (error || !booking) {
    throw new DatabaseError(`Failed to create booking: ${error?.message}`);
  }

  return booking;
}

async function createPaymentForBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  booking: Booking,
  listing: ListingWithOwner,
  renterId: string,
  pricing: ReturnType<typeof calculatePricing>,
): Promise<string> {
  const { data: renter, error: renterError } = await supabaseAdmin.from('profiles').select('id, display_name').eq('id', renterId).single();

  if (renterError || !renter) {
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
    throw new NotFoundError('Renter profile not found');
  }

  const owner = listing.profiles as Profile;
  const paywayBooking: PayWayBooking = {
    id: booking.id,
    listingTitle: listing.title,
    renterFirstName: renter.display_name?.split(' ')[0] || 'User',
    renterLastName: renter.display_name?.split(' ').slice(1).join(' ') || 'User',
    renterEmail: 'test@example.com',
    renterPhone: '+85512345678',
    ownerId: listing.owner_id,
    ownerPaywayBeneficiaryId: owner.payway_beneficiary_id || '',
  };

  const paymentResult = await createPreAuth(env, paywayBooking, pricing);

  await supabaseAdmin.from('transactions').insert({
    booking_id: booking.id,
    type: TRANSACTION_TYPE.PRE_AUTH,
    status: TRANSACTION_STATUS.PENDING,
    amount: pricing.total_renter_pays,
    currency: listing.currency,
    payway_tran_id: paymentResult.payway_tran_id,
  });

  return paymentResult.checkout_url;
}

export async function createBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  renterId: string,
  input: CreateBookingInput,
): Promise<{ booking: Booking; checkout_url: string }> {
  const listing = await fetchListingWithOwner(supabaseAdmin, input.listing_id);
  await checkBookingConflicts(supabaseAdmin, input.listing_id, input.start_time, input.end_time);

  const pricingInput = buildPricingInput(listing, input);
  const pricing = calculatePricing(pricingInput);

  const booking = await createBookingRecord(supabaseAdmin, renterId, listing, input, pricing);
  const checkoutUrl = await createPaymentForBooking(supabaseAdmin, env, booking, listing, renterId, pricing);

  return { booking, checkout_url: checkoutUrl };
}

export async function approveBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.APPROVED, userId, booking);

  const transaction = booking.transactions?.[0];
  if (!transaction?.payway_tran_id) {
    throw new ValidationError('No payment transaction found for this booking');
  }

  try {
    await captureWithPayout(env, transaction.payway_tran_id);
  } catch (err) {
    log.error({ err, booking_id: bookingId, tran_id: transaction.payway_tran_id }, 'Payment capture failed during approval');
    throw err;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: BOOKING_STATUS.APPROVED,
      approved_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    log.warn({ booking_id: bookingId, tran_id: transaction.payway_tran_id }, 'DB update failed after payment capture - queuing compensation');
    await queueCompensation(supabaseAdmin, 'cancel_preauth', { payway_tran_id: transaction.payway_tran_id }, bookingId, transaction.id);
    throw new DatabaseError(`Failed to approve booking: ${updateError.message}`);
  }

  const { error: txError } = await supabaseAdmin
    .from('transactions')
    .update({ status: TRANSACTION_STATUS.COMPLETED, processed_at: new Date().toISOString() })
    .eq('id', transaction.id);
  if (txError) {
    log.error({ txError, bookingId, tran_id: transaction.payway_tran_id }, 'Transaction status update failed after approval');
  }

  return updated;
}

export async function declineBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.DECLINED, userId, booking);

  const transaction = booking.transactions?.[0];
  if (transaction?.payway_tran_id) {
    try {
      await cancelPreAuth(env, transaction.payway_tran_id);
    } catch (err) {
      log.error({ err, booking_id: bookingId, tran_id: transaction.payway_tran_id }, 'Pre-auth cancellation failed during decline');
      throw err;
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: BOOKING_STATUS.DECLINED,
      declined_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    log.error(
      { err: updateError, booking_id: bookingId, tran_id: transaction?.payway_tran_id },
      'DB update failed after pre-auth cancellation - pre-auth already released',
    );
    throw new DatabaseError(`Failed to decline booking: ${updateError.message}`);
  }

  if (transaction?.id) {
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .update({ status: TRANSACTION_STATUS.CANCELLED, processed_at: new Date().toISOString() })
      .eq('id', transaction.id);
    if (txError) {
      log.error({ txError, bookingId, tran_id: transaction.payway_tran_id }, 'Transaction status update failed after decline');
    }
  }

  return updated;
}

async function processCancellationPayment(env: Env, booking: Booking, transaction: { payway_tran_id?: string } | undefined): Promise<void> {
  if (!transaction?.payway_tran_id) return;

  if (booking.status === BOOKING_STATUS.REQUESTED || booking.status === BOOKING_STATUS.APPROVED) {
    await cancelPreAuth(env, transaction.payway_tran_id);
  } else if (booking.status === BOOKING_STATUS.ACTIVE) {
    await refundPayment(env, transaction.payway_tran_id);
  }
}

async function handleCancellationFailure(
  supabaseAdmin: SupabaseClient,
  booking: Booking,
  bookingId: string,
  transaction: { id?: string; payway_tran_id?: string } | undefined,
): Promise<void> {
  if (booking.status === BOOKING_STATUS.ACTIVE && transaction?.payway_tran_id) {
    log.error({ booking_id: bookingId, tran_id: transaction.payway_tran_id }, 'CRITICAL: DB update failed after refund - queuing booking cancellation');
    await queueCompensation(supabaseAdmin, 'cancel_booking', { booking_id: bookingId }, bookingId, transaction.id);
  } else if (transaction?.payway_tran_id) {
    log.warn({ booking_id: bookingId, tran_id: transaction.payway_tran_id }, 'DB update failed after pre-auth cancellation - pre-auth already released');
  }
}

async function updateTransactionStatus(supabaseAdmin: SupabaseClient, transactionId: string, bookingStatus: string, paywayTranId?: string): Promise<void> {
  const txStatus = bookingStatus === BOOKING_STATUS.ACTIVE ? TRANSACTION_STATUS.REFUNDED : TRANSACTION_STATUS.CANCELLED;
  const { error: txError } = await supabaseAdmin
    .from('transactions')
    .update({ status: txStatus, processed_at: new Date().toISOString() })
    .eq('id', transactionId);
  if (txError) {
    log.error({ txError, tran_id: paywayTranId }, 'Transaction status update failed after cancellation');
  }
}

export async function cancelBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string, reason?: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.CANCELLED, userId, booking);

  const transaction = booking.transactions?.[0];

  if (transaction?.payway_tran_id) {
    try {
      await processCancellationPayment(env, booking, transaction);
    } catch (err) {
      log.error({ err, booking_id: bookingId, tran_id: transaction.payway_tran_id, booking_status: booking.status }, 'Payment operation failed during cancellation');
      throw err;
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason,
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    await handleCancellationFailure(supabaseAdmin, booking, bookingId, transaction);
    throw new DatabaseError(`Failed to cancel booking: ${updateError.message}`);
  }

  if (transaction?.id) {
    await updateTransactionStatus(supabaseAdmin, transaction.id, booking.status, transaction.payway_tran_id);
  }

  return updated;
}

export async function completeBooking(supabaseAdmin: SupabaseClient, bookingId: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.COMPLETED, 'system', booking);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: BOOKING_STATUS.COMPLETED,
      completed_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    throw new DatabaseError(`Failed to complete booking: ${updateError.message}`);
  }

  return updated;
}

export async function getBooking(supabaseAdmin: SupabaseClient, bookingId: string, userId: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.renter_id !== userId && booking.owner_id !== userId) {
    throw new ForbiddenError('You can only view your own bookings');
  }

  return booking;
}

export async function getUserBookings(supabaseAdmin: SupabaseClient, userId: string, role?: 'renter' | 'owner'): Promise<Booking[]> {
  let query = supabaseAdmin.from('bookings').select().or(`renter_id.eq.${userId},owner_id.eq.${userId}`).order('created_at', { ascending: false });

  if (role === 'renter') {
    query = query.eq('renter_id', userId);
  } else if (role === 'owner') {
    query = query.eq('owner_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to get bookings: ${error.message}`);
  }

  return data || [];
}

export async function activateBooking(supabaseAdmin: SupabaseClient, bookingId: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.ACTIVE, 'system', booking);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: BOOKING_STATUS.ACTIVE,
      started_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    throw new DatabaseError(`Failed to activate booking: ${updateError.message}`);
  }

  return updated;
}
