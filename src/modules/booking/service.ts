/**
 * Booking Service
 * Business logic for booking management
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../config/env';
import { ConflictError, DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/lib/errors';
import { log } from '../../shared/middleware/logger';
import type { Booking, Profile } from '../../shared/types/database';
import { queueCompensation } from '../compensation';
import { cancelPreAuth, captureWithPayout, createPreAuth, type PayWayBooking, refundPayment } from '../mock';
import { calculatePricing, type PricingInput } from '../pricing';
import { validateTransition } from './state-machine';

export interface CreateBookingInput {
  listing_id: string;
  start_time: string;
  end_time: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_address?: string;
  protection_plan?: 'none' | 'basic' | 'premium';
}

export async function createBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  renterId: string,
  input: CreateBookingInput,
): Promise<{ booking: Booking; checkout_url: string }> {
  const { data: LISTING, error: LISTING_ERROR } = await supabaseAdmin
    .from('listings')
    .select('*, profiles!listings_owner_id_fkey(*)')
    .eq('id', input.listing_id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();

  if (LISTING_ERROR || !LISTING) {
    throw new NotFoundError('Listing not found or not available');
  }

  const OWNER = LISTING.profiles as Profile | null;
  if (!OWNER) {
    throw new NotFoundError('Listing owner not found');
  }

  const { data: CONFLICTS } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('listing_id', input.listing_id)
    .in('status', ['requested', 'approved', 'active'])
    .or(`start_time.lt.${input.end_time},end_time.gt.${input.start_time}`);

  if (CONFLICTS && CONFLICTS.length > 0) {
    throw new ConflictError('Listing is not available for the selected dates');
  }

  const PRICING_INPUT: PricingInput = {
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceHourly: LISTING.price_hourly,
    priceDaily: LISTING.price_daily,
    priceWeekly: LISTING.price_weekly,
    depositAmount: LISTING.deposit_amount,
    deliveryMethod: input.delivery_method || 'pickup',
    deliveryFee: LISTING.delivery_available && input.delivery_method === 'delivery' ? LISTING.delivery_fee : 0,
    protectionPlan: input.protection_plan || 'none',
    serviceFeeRate: 0.12,
  };

  const PRICING = calculatePricing(PRICING_INPUT);

  const { data: BOOKING, error: BOOKING_ERROR } = await supabaseAdmin
    .from('bookings')
    .insert({
      listing_id: input.listing_id,
      renter_id: renterId,
      owner_id: LISTING.owner_id,
      start_time: input.start_time,
      end_time: input.end_time,
      status: 'requested',
      subtotal: PRICING.subtotal,
      service_fee: PRICING.service_fee,
      delivery_fee: PRICING.delivery_fee,
      protection_fee: PRICING.protection_fee,
      deposit_amount: PRICING.deposit_amount,
      total_amount: PRICING.total_renter_pays,
      owner_payout: PRICING.owner_payout,
      currency: LISTING.currency,
      delivery_method: input.delivery_method || 'pickup',
      delivery_address: input.delivery_address,
      protection_plan: input.protection_plan || 'none',
      payment_authorized: false,
    })
    .select()
    .single();

  if (BOOKING_ERROR || !BOOKING) {
    throw new DatabaseError(`Failed to create booking: ${BOOKING_ERROR?.message}`);
  }

  const { data: RENTER, error: RENTER_ERROR } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name')
    .eq('id', renterId)
    .single();

  if (RENTER_ERROR || !RENTER) {
    // Cleanup the booking if renter profile doesn't exist
    await supabaseAdmin.from('bookings').delete().eq('id', BOOKING.id);
    throw new NotFoundError('Renter profile not found');
  }

  const PAYWAY_BOOKING: PayWayBooking = {
    id: BOOKING.id,
    listingTitle: LISTING.title,
    renterFirstName: RENTER.display_name?.split(' ')[0] || 'User',
    renterLastName: RENTER.display_name?.split(' ').slice(1).join(' ') || 'User',
    renterEmail: 'test@example.com',
    renterPhone: '+85512345678',
    ownerId: LISTING.owner_id,
    ownerPaywayBeneficiaryId: OWNER.payway_beneficiary_id || '',
  };

  const PAYMENT_RESULT = await createPreAuth(env, PAYWAY_BOOKING, PRICING);

  await supabaseAdmin.from('transactions').insert({
    booking_id: BOOKING.id,
    type: 'pre_auth',
    status: 'pending',
    amount: PRICING.total_renter_pays,
    currency: LISTING.currency,
    payway_tran_id: PAYMENT_RESULT.payway_tran_id,
  });

  return {
    booking: BOOKING,
    checkout_url: PAYMENT_RESULT.checkout_url,
  };
}

export async function approveBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(BOOKING.status, 'approved', userId, BOOKING);

  const TRANSACTION = BOOKING.transactions?.[0];
  if (!TRANSACTION?.payway_tran_id) {
    throw new ValidationError('No payment transaction found for this booking');
  }

  try {
    await captureWithPayout(env, TRANSACTION.payway_tran_id);
  } catch (err) {
    log.error({ err, booking_id: bookingId, tran_id: TRANSACTION.payway_tran_id }, 'Payment capture failed during approval');
    throw err;
  }

  const { data: UPDATED, error: UPDATE_ERROR } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (UPDATE_ERROR) {
    log.warn({ booking_id: bookingId, tran_id: TRANSACTION.payway_tran_id }, 'DB update failed after payment capture - queuing compensation');
    await queueCompensation(supabaseAdmin, 'cancel_preauth', { payway_tran_id: TRANSACTION.payway_tran_id }, bookingId, TRANSACTION.id);
    throw new DatabaseError(`Failed to approve booking: ${UPDATE_ERROR.message}`);
  }

  const { error: txError } = await supabaseAdmin
    .from('transactions')
    .update({ status: 'completed', processed_at: new Date().toISOString() })
    .eq('id', TRANSACTION.id);
  if (txError) {
    log.error({ txError, bookingId, tran_id: TRANSACTION.payway_tran_id }, 'Transaction status update failed after approval');
  }

  return UPDATED;
}

export async function declineBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(BOOKING.status, 'declined', userId, BOOKING);

  const TRANSACTION = BOOKING.transactions?.[0];
  if (TRANSACTION?.payway_tran_id) {
    try {
      await cancelPreAuth(env, TRANSACTION.payway_tran_id);
    } catch (err) {
      log.error({ err, booking_id: bookingId, tran_id: TRANSACTION.payway_tran_id }, 'Pre-auth cancellation failed during decline');
      throw err;
    }
  }

  const { data: UPDATED, error: UPDATE_ERROR } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (UPDATE_ERROR) {
    log.error(
      { err: UPDATE_ERROR, booking_id: bookingId, tran_id: TRANSACTION?.payway_tran_id },
      'DB update failed after pre-auth cancellation - pre-auth already released',
    );
    throw new DatabaseError(`Failed to decline booking: ${UPDATE_ERROR.message}`);
  }

  if (TRANSACTION?.id) {
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'cancelled', processed_at: new Date().toISOString() })
      .eq('id', TRANSACTION.id);
    if (txError) {
      log.error({ txError, bookingId, tran_id: TRANSACTION.payway_tran_id }, 'Transaction status update failed after decline');
    }
  }

  return UPDATED;
}

export async function cancelBooking(supabaseAdmin: SupabaseClient, env: Env, bookingId: string, userId: string, reason?: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select('*, transactions(*)').eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(BOOKING.status, 'cancelled', userId, BOOKING);

  const TRANSACTION = BOOKING.transactions?.[0];

  if (TRANSACTION?.payway_tran_id) {
    try {
      if (BOOKING.status === 'requested' || BOOKING.status === 'approved') {
        await cancelPreAuth(env, TRANSACTION.payway_tran_id);
      } else if (BOOKING.status === 'active') {
        await refundPayment(env, TRANSACTION.payway_tran_id);
      }
    } catch (err) {
      log.error(
        {
          err,
          booking_id: bookingId,
          tran_id: TRANSACTION.payway_tran_id,
          booking_status: BOOKING.status,
        },
        'Payment operation failed during cancellation',
      );
      throw err;
    }
  }

  const { data: UPDATED, error: UPDATE_ERROR } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason,
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (UPDATE_ERROR) {
    if (BOOKING.status === 'active' && TRANSACTION?.payway_tran_id) {
      log.error(
        { err: UPDATE_ERROR, booking_id: bookingId, tran_id: TRANSACTION.payway_tran_id },
        'CRITICAL: DB update failed after refund - queuing booking cancellation',
      );
      await queueCompensation(supabaseAdmin, 'cancel_booking', { booking_id: bookingId }, bookingId, TRANSACTION.id);
    } else if (TRANSACTION?.payway_tran_id) {
      log.warn(
        { booking_id: bookingId, tran_id: TRANSACTION.payway_tran_id },
        'DB update failed after pre-auth cancellation - pre-auth already released',
      );
    }
    throw new DatabaseError(`Failed to cancel booking: ${UPDATE_ERROR.message}`);
  }

  if (TRANSACTION?.id) {
    const TX_STATUS = BOOKING.status === 'active' ? 'refunded' : 'cancelled';
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .update({ status: TX_STATUS, processed_at: new Date().toISOString() })
      .eq('id', TRANSACTION.id);
    if (txError) {
      log.error({ txError, bookingId, tran_id: TRANSACTION.payway_tran_id }, 'Transaction status update failed after cancellation');
    }
  }

  return UPDATED;
}

export async function completeBooking(supabaseAdmin: SupabaseClient, bookingId: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(BOOKING.status, 'completed', 'system', BOOKING);

  const { data: UPDATED, error: UPDATE_ERROR } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (UPDATE_ERROR) {
    throw new DatabaseError(`Failed to complete booking: ${UPDATE_ERROR.message}`);
  }

  return UPDATED;
}

export async function getBooking(supabaseAdmin: SupabaseClient, bookingId: string, userId: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  if (BOOKING.renter_id !== userId && BOOKING.owner_id !== userId) {
    throw new ForbiddenError('You can only view your own bookings');
  }

  return BOOKING;
}

export async function getUserBookings(supabaseAdmin: SupabaseClient, userId: string, role?: 'renter' | 'owner'): Promise<Booking[]> {
  let QUERY = supabaseAdmin.from('bookings').select().or(`renter_id.eq.${userId},owner_id.eq.${userId}`).order('created_at', { ascending: false });

  if (role === 'renter') {
    QUERY = QUERY.eq('renter_id', userId);
  } else if (role === 'owner') {
    QUERY = QUERY.eq('owner_id', userId);
  }

  const { data, error } = await QUERY;

  if (error) {
    throw new DatabaseError(`Failed to get bookings: ${error.message}`);
  }

  return data || [];
}

export async function activateBooking(supabaseAdmin: SupabaseClient, bookingId: string): Promise<Booking> {
  const { data: BOOKING, error } = await supabaseAdmin.from('bookings').select().eq('id', bookingId).single();

  if (error || !BOOKING) {
    throw new NotFoundError('Booking not found');
  }

  validateTransition(BOOKING.status, 'active', 'system', BOOKING);

  const { data: UPDATED, error: UPDATE_ERROR } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (UPDATE_ERROR) {
    throw new DatabaseError(`Failed to activate booking: ${UPDATE_ERROR.message}`);
  }

  return UPDATED;
}
