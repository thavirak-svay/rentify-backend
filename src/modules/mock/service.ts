import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '@/config/env';
import { TRANSACTION_STATUS } from '@/constants';

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

export function createPreAuth(_env: Env, _booking: MockPayWayBooking, _pricing: MockPayWayPricing): MockPreAuthResult {
  const tranId = `MOCK${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    transaction_id: tranId,
    payway_tran_id: tranId,
    checkout_url: `/mock-payment?tran_id=${tranId}&status=pending`,
  };
}

export function captureWithPayout(_env: Env, _paywayTranId: string): { success: boolean; grand_total: number; transaction_status: string } {
  return {
    success: true,
    grand_total: 0,
    transaction_status: TRANSACTION_STATUS.COMPLETED,
  };
}

export function cancelPreAuth(_env: Env, _paywayTranId: string): { success: boolean; transaction_status: string } {
  return {
    success: true,
    transaction_status: TRANSACTION_STATUS.CANCELLED,
  };
}

export function refundPayment(_env: Env, _paywayTranId: string): { success: boolean; total_refunded: number; transaction_status: string } {
  return {
    success: true,
    total_refunded: 0,
    transaction_status: TRANSACTION_STATUS.REFUNDED,
  };
}

export function checkTransaction(_env: Env, _paywayTranId: string): { payment_status: string; amount: number; currency: string } {
  return {
    payment_status: TRANSACTION_STATUS.PENDING,
    amount: 0,
    currency: 'USD',
  };
}

export function verifyCallbackHash(_env: Env, _payload: { tran_id: string; status: string; hash: string }): boolean {
  return true;
}

export async function simulateCallback(
  supabaseAdmin: SupabaseClient,
  transactionId: string,
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'CANCELLED',
): Promise<void> {
  const { data: transaction } = await supabaseAdmin.from('transactions').select('booking_id').eq('payway_tran_id', transactionId).single();

  if (transaction) {
    await supabaseAdmin
      .from('transactions')
      .update({
        status: status === 'APPROVED' ? TRANSACTION_STATUS.AUTHORIZED : TRANSACTION_STATUS.FAILED,
      })
      .eq('payway_tran_id', transactionId);

    if (status === 'APPROVED') {
      await supabaseAdmin.from('bookings').update({ payment_authorized: true }).eq('id', transaction.booking_id);
    }
  }
}

export type PayWayBooking = MockPayWayBooking;
