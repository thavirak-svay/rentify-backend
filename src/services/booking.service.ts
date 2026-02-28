import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env";
import { validateTransition } from "../lib/booking-machine";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors";
import { calculatePricing, type PricingInput } from "../lib/pricing";
import type { Booking, Profile } from "../types/database";
import * as paymentService from "./payment.service";

export interface CreateBookingInput {
  listing_id: string;
  start_time: string;
  end_time: string;
  delivery_method?: "pickup" | "delivery";
  delivery_address?: string;
  protection_plan?: "none" | "basic" | "premium";
}

export async function createBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  renterId: string,
  input: CreateBookingInput
): Promise<{ booking: Booking; checkout_url: string }> {
  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("*, profiles!listings_owner_id_fkey(*)")
    .eq("id", input.listing_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (listingError || !listing) {
    throw new NotFoundError("Listing not found or not available");
  }

  const owner = listing.profiles as Profile;

  const { data: conflicts } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("listing_id", input.listing_id)
    .in("status", ["requested", "approved", "active"])
    .or(`start_time.lt.${input.end_time},end_time.gt.${input.start_time}`);

  if (conflicts && conflicts.length > 0) {
    throw new ConflictError("Listing is not available for the selected dates");
  }

  const pricingInput: PricingInput = {
    startTime: new Date(input.start_time),
    endTime: new Date(input.end_time),
    priceHourly: listing.price_hourly,
    priceDaily: listing.price_daily,
    priceWeekly: listing.price_weekly,
    depositAmount: listing.deposit_amount,
    deliveryMethod: input.delivery_method || "pickup",
    deliveryFee:
      listing.delivery_available && input.delivery_method === "delivery" ? listing.delivery_fee : 0,
    protectionPlan: input.protection_plan || "none",
    serviceFeeRate: 0.12,
  };

  const pricing = calculatePricing(pricingInput);

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      listing_id: input.listing_id,
      renter_id: renterId,
      owner_id: listing.owner_id,
      start_time: input.start_time,
      end_time: input.end_time,
      status: "requested",
      subtotal: pricing.subtotal,
      service_fee: pricing.service_fee,
      delivery_fee: pricing.delivery_fee,
      protection_fee: pricing.protection_fee,
      deposit_amount: pricing.deposit_amount,
      total_amount: pricing.total_renter_pays,
      owner_payout: pricing.owner_payout,
      currency: listing.currency,
      delivery_method: input.delivery_method || "pickup",
      delivery_address: input.delivery_address,
      protection_plan: input.protection_plan || "none",
      payment_authorized: false,
    })
    .select()
    .single();

  if (bookingError || !booking) {
    throw new Error(`Failed to create booking: ${bookingError?.message}`);
  }

  const { data: renter } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", renterId)
    .single();

  const paywayBooking: paymentService.PayWayBooking = {
    id: booking.id,
    listingTitle: listing.title,
    renterFirstName: renter?.display_name?.split(" ")[0] || "User",
    renterLastName: renter?.display_name?.split(" ").slice(1).join(" ") || "User",
    renterEmail: "test@example.com",
    renterPhone: "+85512345678",
    ownerId: listing.owner_id,
    ownerPaywayBeneficiaryId: owner.payway_beneficiary_id || "",
  };

  let checkoutUrl = "";

  try {
    const paymentResult = await paymentService.createPreAuth(env, paywayBooking, pricing);
    checkoutUrl = paymentResult.checkout_url;

    await supabaseAdmin.from("transactions").insert({
      booking_id: booking.id,
      type: "pre_auth",
      status: "pending",
      amount: pricing.total_renter_pays,
      currency: listing.currency,
      payway_tran_id: paymentResult.payway_tran_id,
    });
  } catch (e) {
    console.error("PayWay pre-auth failed:", e);
    checkoutUrl = "";
  }

  return {
    booking,
    checkout_url: checkoutUrl,
  };
}

export async function approveBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, transactions(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  validateTransition(booking.status, "approved", userId, booking);

  const transaction = booking.transactions?.[0];
  if (transaction?.payway_tran_id) {
    try {
      await paymentService.captureWithPayout(env, transaction.payway_tran_id);
      await supabaseAdmin
        .from("transactions")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("payway_tran_id", transaction.payway_tran_id);
    } catch (e) {
      console.error("PayWay capture failed:", e);
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to approve booking: ${updateError.message}`);
  }

  return updated;
}

export async function declineBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, transactions(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  validateTransition(booking.status, "declined", userId, booking);

  const transaction = booking.transactions?.[0];
  if (transaction?.payway_tran_id) {
    try {
      await paymentService.cancelPreAuth(env, transaction.payway_tran_id);
      await supabaseAdmin
        .from("transactions")
        .update({ status: "cancelled", processed_at: new Date().toISOString() })
        .eq("payway_tran_id", transaction.payway_tran_id);
    } catch (e) {
      console.error("PayWay cancel failed:", e);
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to decline booking: ${updateError.message}`);
  }

  return updated;
}

export async function cancelBooking(
  supabaseAdmin: SupabaseClient,
  env: Env,
  bookingId: string,
  userId: string,
  reason?: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, transactions(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  validateTransition(booking.status, "cancelled", userId, booking);

  const transaction = booking.transactions?.[0];

  if (transaction?.payway_tran_id) {
    try {
      if (booking.status === "requested" || booking.status === "approved") {
        await paymentService.cancelPreAuth(env, transaction.payway_tran_id);
      } else if (booking.status === "active") {
        await paymentService.refundPayment(env, transaction.payway_tran_id);
      }
      const txStatus = booking.status === "active" ? "refunded" : "cancelled";
      await supabaseAdmin
        .from("transactions")
        .update({ status: txStatus, processed_at: new Date().toISOString() })
        .eq("payway_tran_id", transaction.payway_tran_id);
    } catch (e) {
      console.error("PayWay cancel/refund failed:", e);
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to cancel booking: ${updateError.message}`);
  }

  return updated;
}

export async function activateBooking(
  supabaseAdmin: SupabaseClient,
  bookingId: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select()
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.status !== "approved") {
    throw new Error("Can only activate approved bookings");
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to activate booking: ${updateError.message}`);
  }

  return updated;
}

export async function completeBooking(
  supabaseAdmin: SupabaseClient,
  bookingId: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select()
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  validateTransition(booking.status, "completed", "system", booking);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to complete booking: ${updateError.message}`);
  }

  return updated;
}

export async function getBooking(
  supabaseAdmin: SupabaseClient,
  bookingId: string,
  userId: string
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select()
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.renter_id !== userId && booking.owner_id !== userId) {
    throw new ForbiddenError("You can only view your own bookings");
  }

  return booking;
}

export async function getUserBookings(
  supabaseAdmin: SupabaseClient,
  userId: string,
  role?: "renter" | "owner"
): Promise<Booking[]> {
  let query = supabaseAdmin
    .from("bookings")
    .select()
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (role === "renter") {
    query = query.eq("renter_id", userId);
  } else if (role === "owner") {
    query = query.eq("owner_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get bookings: ${error.message}`);
  }

  return data || [];
}
