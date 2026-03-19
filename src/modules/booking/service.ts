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

export async function createBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  renterId: string,
  input: CreateBookingInput,
): Promise<{ booking: Booking; checkout_url: string }> {
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('*, profiles!listings_owner_id_fkey(*)')
    .eq('id', input.listing_id)
    .eq('status', LISTING_STATUS.ACTIVE)
    .is('deleted_at', null)
    .single();

  if (listingError || !listing) {
    throw new NotFoundError('Listing not found or not available');
  }

  const owner = listing.profiles as Profile | null;
  if (!owner) {
    throw new NotFoundError('Listing owner not found');
  }

  const { data: conflicts } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('listing_id', input.listing_id)
    .in('status', [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.ACTIVE])
    .or(`start_time.lt.${input.end_time},end_time.gt.${input.start_time}`);

  if (conflicts && conflicts.length > 0) {
    throw new ConflictError('Listing is not available for the selected dates');
  }

  const pricingInput: PricingInput = {
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceHourly: listing.price_hourly,
    priceDaily: listing.price_daily,
    priceWeekly: listing.price_weekly,
    depositAmount: listing.deposit_amount,
    deliveryMethod: input.delivery_method || DELIVERY_METHOD.PICKUP,
    deliveryFee: listing.delivery_available && input.delivery_method === DELIVERY_METHOD.DELIVERY ? listing.delivery_fee : 0,
    protectionPlan: input.protection_plan || PROTECTION_PLAN.NONE,
    serviceFeeRate: 0.12,
  };

  const pricing = calculatePricing(pricingInput);

  const { data: booking, error: bookingError } = await supabaseAdmin
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

  if (bookingError || !booking) {
    throw new DatabaseError(`Failed to create booking: ${bookingError?.message}`);
  }

  const { data: renter, error: renterError } = await supabaseAdmin.from('profiles').select('id, display_name').eq('id', renterId).single();

  if (renterError || !renter) {
    // Cleanup the booking if renter profile doesn't exist
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
    throw new NotFoundError('Renter profile not found');
  }

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

  return {
    booking: booking,
    checkout_url: paymentResult.checkout_url,
  };
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

export async function cancelBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string, reason?: string): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !booking) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(booking.status, BOOKING_STATUS.CANCELLED, userId, booking);

  const transaction = booking.transactions?.[0];

  if (transaction?.payway_tran_id) {
    try {
      if (booking.status === BOOKING_STATUS.REQUESTED || booking.status === BOOKING_STATUS.APPROVED) {
        cancelPreAuth(env, transaction.payway_tran_id);
      } else if (booking.status === BOOKING_STATUS.ACTIVE) {
        refundPayment(env, transaction.payway_tran_id);
      }
    } catch (err) {
      log.error(
        {
          err,
          booking_id: bookingId,
          tran_id: transaction.payway_tran_id,
          booking_status: booking.status,
        },
        'Payment operation failed during cancellation',
      );
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
    if (booking.status === BOOKING_STATUS.ACTIVE && transaction?.payway_tran_id) {
      log.error(
        { err: updateError, booking_id: bookingId, tran_id: transaction.payway_tran_id },
        'CRITICAL: DB update failed after refund - queuing booking cancellation',
      );
      await queueCompensation(supabaseAdmin, 'cancel_booking', { booking_id: bookingId }, bookingId, transaction.id);
    } else if (transaction?.payway_tran_id) {
      log.warn(
        { booking_id: bookingId, tran_id: transaction.payway_tran_id },
        'DB update failed after pre-auth cancellation - pre-auth already released',
      );
    }
    throw new DatabaseError(`Failed to cancel booking: ${updateError.message}`);
  }

  if (transaction?.id) {
    const txStatus = booking.status === BOOKING_STATUS.ACTIVE ? TRANSACTION_STATUS.REFUNDED : TRANSACTION_STATUS.CANCELLED;
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .update({ status: txStatus, processed_at: new Date().toISOString() })
      .eq('id', transaction.id);
    if (txError) {
      log.error({ txError, bookingId, tran_id: transaction.payway_tran_id }, 'Transaction status update failed after cancellation');
    }
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
