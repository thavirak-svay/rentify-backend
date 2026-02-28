import type { Env } from "../config/env";

export interface MockPayWayBooking {
  id: string;
  listingTitle: string;
  renterFirstName: string;
  renterLastName: string;
  renterEmail: string;
  renterPhone: string;
  ownerId: string;
  ownerPaywayBeneficiaryId: string;
}

export interface MockPayWayPricing {
  total_renter_pays: number;
  owner_payout: number;
}

export interface MockPreAuthResult {
  transaction_id: string;
  payway_tran_id: string;
  checkout_url: string;
}

export async function createPreAuth(
  _env: Env,
  _booking: MockPayWayBooking,
  _pricing: MockPayWayPricing
): Promise<MockPreAuthResult> {
  const tranId = `MOCK${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    transaction_id: tranId,
    payway_tran_id: tranId,
    checkout_url: `/mock-payment?tran_id=${tranId}&status=pending`,
  };
}

export async function captureWithPayout(
  _env: Env,
  _paywayTranId: string
): Promise<{ success: boolean; grand_total: number; transaction_status: string }> {
  return {
    success: true,
    grand_total: 0,
    transaction_status: "captured",
  };
}

export async function cancelPreAuth(
  _env: Env,
  _paywayTranId: string
): Promise<{ success: boolean; transaction_status: string }> {
  return {
    success: true,
    transaction_status: "cancelled",
  };
}

export async function refundPayment(
  _env: Env,
  _paywayTranId: string
): Promise<{ success: boolean; total_refunded: number; transaction_status: string }> {
  return {
    success: true,
    total_refunded: 0,
    transaction_status: "refunded",
  };
}

export async function checkTransaction(
  _env: Env,
  _paywayTranId: string
): Promise<{ payment_status: string; amount: number; currency: string }> {
  return {
    payment_status: "pending",
    amount: 0,
    currency: "USD",
  };
}
