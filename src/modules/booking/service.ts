import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '@/config/env';
import { BOOKING_STATUS } from '@/constants/booking';
import { LISTING_STATUS } from '@/constants/listing';
import {
  DELIVERY_METHOD,
  type DeliveryMethodType,
  PROTECTION_PLAN,
  type ProtectionPlanType,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@/constants/payment';
import { SERVICE_FEE_RATE } from '@/constants/pricing';
import { queueCompensation } from '@/modules/compensation/service';
import {
  cancelPreAuth,
  captureWithPayout,
  createPreAuth,
  type PayWayBooking,
  refundPayment,
} from '@/modules/mock/service';
import { calculatePricing, type PricingInput } from '@/modules/pricing/calculator';
import { fetchOne, fetchOneWithRelations, insertOne, updateOne } from '@/shared/lib/db-helpers';
import { ConflictError, DatabaseError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { timestamp } from '@/shared/lib/timestamp';
import { requireBookingParticipant } from '@/shared/lib/validators';
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
  status: string;
  deleted_at: string | null;
  profiles: Profile | null;
}

async function fetchListingWithOwner(supabase: SupabaseClient, listingId: string): Promise<ListingWithOwner> {
  const listing = await fetchOneWithRelations<ListingWithOwner>(
    supabase,
    'listings',
    '*, profiles!listings_owner_id_fkey(*)',
    { id: listingId },
    'Listing',
  );

  // Additional checks for active listing
  if (listing.status !== LISTING_STATUS.ACTIVE || listing.deleted_at) {
    throw new NotFoundError('Listing not found or not available');
  }

  if (!listing.profiles) {
    throw new NotFoundError('Listing owner not found');
  }

  return listing;
}

async function checkBookingConflicts(
  supabase: SupabaseClient,
  listingId: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  const { data: conflicts } = await supabase
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
  if (!listing.price_daily) {
    throw new ValidationError('Listing must have a daily price');
  }

  return {
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceHourly: listing.price_hourly,
    priceDaily: listing.price_daily,
    priceWeekly: listing.price_weekly,
    depositAmount: listing.deposit_amount,
    deliveryMethod: input.delivery_method || DELIVERY_METHOD.PICKUP,
    deliveryFee:
      listing.delivery_available && input.delivery_method === DELIVERY_METHOD.DELIVERY
        ? listing.delivery_fee ?? 0
        : 0,
    protectionPlan: input.protection_plan || PROTECTION_PLAN.NONE,
    serviceFeeRate: SERVICE_FEE_RATE,
  };
}

async function createBookingRecord(
  supabase: SupabaseClient,
  renterId: string,
  listing: ListingWithOwner,
  input: CreateBookingInput,
  pricing: ReturnType<typeof calculatePricing>,
): Promise<Booking> {
  return insertOne<Booking>(supabase, 'bookings', {
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
  }, 'Booking');
}

async function createPaymentForBooking(
  supabase: SupabaseClient,
  env: Env,
  booking: Booking,
  listing: ListingWithOwner,
  renterId: string,
  pricing: ReturnType<typeof calculatePricing>,
): Promise<string> {
  const renter = await fetchOne<{ id: string; display_name: string | null }>(
    supabase,
    'profiles',
    { id: renterId },
    'Profile',
  );

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

  await supabase.from('transactions').insert({
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
  supabase: SupabaseClient,
  env: Env,
  renterId: string,
  input: CreateBookingInput,
): Promise<{ booking: Booking; checkout_url: string }> {
  const listing = await fetchListingWithOwner(supabase, input.listing_id);
  await checkBookingConflicts(supabase, input.listing_id, input.start_time, input.end_time);

  const pricingInput = buildPricingInput(listing, input);
  const pricing = calculatePricing(pricingInput);

  const booking = await createBookingRecord(supabase, renterId, listing, input, pricing);
  const checkoutUrl = await createPaymentForBooking(supabase, env, booking, listing, renterId, pricing);

  return { booking, checkout_url: checkoutUrl };
}

export async function approveBooking(
  supabase: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string,
): Promise<Booking> {
  const booking = await fetchOneWithRelations<Booking & { transactions: { id: string; payway_tran_id: string }[] }>(
    supabase,
    'bookings',
    '*, transactions(*)',
    { id: bookingId },
    'Booking',
  );

  validateTransition(booking.status, BOOKING_STATUS.APPROVED, userId, booking);

  const transaction = booking.transactions?.[0];
  if (!transaction?.payway_tran_id) {
    throw new ValidationError('No payment transaction found for this booking');
  }

  try {
    await captureWithPayout(env, transaction.payway_tran_id);
  } catch (err) {
    log.error(
      { err, booking_id: bookingId, tran_id: transaction.payway_tran_id },
      'Payment capture failed during approval',
    );
    throw err;
  }

  const updated = await updateOne<Booking>(
    supabase,
    'bookings',
    bookingId,
    { status: BOOKING_STATUS.APPROVED, approved_at: timestamp.now() },
    'Booking',
  );

  const { error: txError } = await supabase
    .from('transactions')
    .update({ status: TRANSACTION_STATUS.COMPLETED, processed_at: timestamp.now() })
    .eq('id', transaction.id);

  if (txError) {
    log.error({ txError, bookingId, tran_id: transaction.payway_tran_id }, 'Transaction status update failed');
  }

  return updated;
}

export async function declineBooking(
  supabase: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string,
): Promise<Booking> {
  const booking = await fetchOneWithRelations<Booking & { transactions: { id: string; payway_tran_id: string }[] }>(
    supabase,
    'bookings',
    '*, transactions(*)',
    { id: bookingId },
    'Booking',
  );

  validateTransition(booking.status, BOOKING_STATUS.DECLINED, userId, booking);

  const transaction = booking.transactions?.[0];
  if (transaction?.payway_tran_id) {
    try {
      await cancelPreAuth(env, transaction.payway_tran_id);
    } catch (err) {
      log.error(
        { err, booking_id: bookingId, tran_id: transaction.payway_tran_id },
        'Pre-auth cancellation failed during decline',
      );
      throw err;
    }
  }

  const updated = await updateOne<Booking>(
    supabase,
    'bookings',
    bookingId,
    { status: BOOKING_STATUS.DECLINED, declined_at: timestamp.now() },
    'Booking',
  );

  if (transaction?.id) {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: TRANSACTION_STATUS.CANCELLED, processed_at: timestamp.now() })
      .eq('id', transaction.id);

    if (txError) {
      log.error({ txError, bookingId }, 'Transaction status update failed');
    }
  }

  return updated;
}

async function processCancellationPayment(
  env: Env,
  booking: Booking,
  transaction: { payway_tran_id?: string } | undefined,
): Promise<void> {
  if (!transaction?.payway_tran_id) return;

  if (booking.status === BOOKING_STATUS.REQUESTED || booking.status === BOOKING_STATUS.APPROVED) {
    cancelPreAuth(env, transaction.payway_tran_id);
  } else if (booking.status === BOOKING_STATUS.ACTIVE) {
    refundPayment(env, transaction.payway_tran_id);
  }
}

async function handleCancellationFailure(
  supabase: SupabaseClient,
  booking: Booking,
  bookingId: string,
  transaction: { id?: string; payway_tran_id?: string } | undefined,
): Promise<void> {
  if (booking.status === BOOKING_STATUS.ACTIVE && transaction?.payway_tran_id) {
    log.error(
      { booking_id: bookingId, tran_id: transaction.payway_tran_id },
      'CRITICAL: DB update failed after refund - queuing booking cancellation',
    );
    await queueCompensation(supabase, 'cancel_booking', { booking_id: bookingId }, bookingId, transaction.id);
  } else if (transaction?.payway_tran_id) {
    log.warn(
      { booking_id: bookingId, tran_id: transaction.payway_tran_id },
      'DB update failed after pre-auth cancellation - pre-auth already released',
    );
  }
}

async function updateTransactionStatus(
  supabase: SupabaseClient,
  transactionId: string,
  bookingStatus: string,
  paywayTranId?: string,
): Promise<void> {
  const txStatus =
    bookingStatus === BOOKING_STATUS.ACTIVE ? TRANSACTION_STATUS.REFUNDED : TRANSACTION_STATUS.CANCELLED;
  const { error: txError } = await supabase
    .from('transactions')
    .update({ status: txStatus, processed_at: timestamp.now() })
    .eq('id', transactionId);

  if (txError) {
    log.error({ txError, tran_id: paywayTranId }, 'Transaction status update failed after cancellation');
  }
}

export async function cancelBooking(
  supabase: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string,
  reason?: string,
): Promise<Booking> {
  const booking = await fetchOneWithRelations<Booking & { transactions: { id: string; payway_tran_id: string }[] }>(
    supabase,
    'bookings',
    '*, transactions(*)',
    { id: bookingId },
    'Booking',
  );

  validateTransition(booking.status, BOOKING_STATUS.CANCELLED, userId, booking);

  const transaction = booking.transactions?.[0];

  if (transaction?.payway_tran_id) {
    try {
      await processCancellationPayment(env, booking, transaction);
    } catch (err) {
      log.error(
        { err, booking_id: bookingId, tran_id: transaction.payway_tran_id, booking_status: booking.status },
        'Payment operation failed during cancellation',
      );
      throw err;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_at: timestamp.now(),
      cancelled_by: userId,
      cancellation_reason: reason,
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    await handleCancellationFailure(supabase, booking, bookingId, transaction);
    throw new DatabaseError(`Failed to cancel booking: ${updateError.message}`);
  }

  if (transaction?.id) {
    await updateTransactionStatus(supabase, transaction.id, booking.status, transaction.payway_tran_id);
  }

  return updated;
}

export async function completeBooking(supabase: SupabaseClient, bookingId: string): Promise<Booking> {
  const booking = await fetchOne<Booking>(supabase, 'bookings', { id: bookingId }, 'Booking');

  validateTransition(booking.status, BOOKING_STATUS.COMPLETED, 'system', booking);

  return updateOne<Booking>(
    supabase,
    'bookings',
    bookingId,
    { status: BOOKING_STATUS.COMPLETED, completed_at: timestamp.now() },
    'Booking',
  );
}

export async function getBooking(supabase: SupabaseClient, bookingId: string, userId: string): Promise<Booking> {
  const booking = await fetchOne<Booking>(supabase, 'bookings', { id: bookingId }, 'Booking');
  requireBookingParticipant(booking, userId);
  return booking;
}

export async function getUserBookings(
  supabase: SupabaseClient,
  userId: string,
  role?: 'renter' | 'owner',
): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select()
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .order('created_at', { ascending: false });

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

export async function activateBooking(supabase: SupabaseClient, bookingId: string): Promise<Booking> {
  const booking = await fetchOne<Booking>(supabase, 'bookings', { id: bookingId }, 'Booking');

  validateTransition(booking.status, BOOKING_STATUS.ACTIVE, 'system', booking);

  return updateOne<Booking>(
    supabase,
    'bookings',
    bookingId,
    { status: BOOKING_STATUS.ACTIVE, started_at: timestamp.now() },
    'Booking',
  );
}