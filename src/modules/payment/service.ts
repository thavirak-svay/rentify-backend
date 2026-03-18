/**
 * Payment Service
 * Business logic for payment operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../config/env';
import { DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/lib/errors';
import { log } from '../../shared/middleware/logger';
import { checkTransaction, refundPayment as refundPayWayPayment, verifyCallbackHash } from '../mock';

export interface PayWayCallbackPayload {
  tran_id: string;
  status: string;
  hash: string;
}

export interface TransactionStatusResult {
  payment_status: string;
  amount: number;
  currency: string;
}

export interface RefundResult {
  success: boolean;
}

export async function handlePaywayCallback(supabaseAdmin: SupabaseClient, env: Env, payload: PayWayCallbackPayload): Promise<void> {
  if (!verifyCallbackHash(env, payload)) {
    throw new ForbiddenError('Invalid payment callback hash');
  }

  const { tran_id, status } = payload;

  const NEW_STATUS = status === 'APPROVED' ? 'authorized' : 'failed';

  const { data: UPDATED_TX, error: UPDATE_ERROR } = await supabaseAdmin
    .from('transactions')
    .update({
      status: NEW_STATUS,
      metadata: { payway_callback: payload },
    })
    .eq('payway_tran_id', tran_id)
    .eq('status', 'pending')
    .select('id, booking_id, status');

  if (UPDATE_ERROR) {
    log.error({ err: UPDATE_ERROR, tran_id }, 'Failed to update transaction');
    throw new DatabaseError('Failed to process payment callback', UPDATE_ERROR);
  }

  if (!UPDATED_TX || UPDATED_TX.length === 0) {
    log.info({ tran_id, status }, 'PayWay callback already processed, skipping');
    return;
  }

  const EXISTING_TX = UPDATED_TX[0];
  if (!EXISTING_TX) {
    return;
  }

  log.info({ tran_id, status, booking_id: EXISTING_TX.booking_id }, 'PayWay callback processed');

  if (status === 'APPROVED') {
    await supabaseAdmin.from('bookings').update({ payment_authorized: true }).eq('id', EXISTING_TX.booking_id);
  }
}

export async function getTransactionStatus(supabaseAdmin: SupabaseClient, env: Env, transactionId: string): Promise<TransactionStatusResult> {
  const { data: TRANSACTION, error } = await supabaseAdmin.from('transactions').select('payway_tran_id').eq('id', transactionId).single();

  if (error || !TRANSACTION?.payway_tran_id) {
    throw new NotFoundError('Transaction not found');
  }

  return checkTransaction(env, TRANSACTION.payway_tran_id);
}

export async function refundTransaction(supabaseAdmin: SupabaseClient, env: Env, transactionId: string): Promise<RefundResult> {
  const { data: TRANSACTION, error } = await supabaseAdmin.from('transactions').select('payway_tran_id, status').eq('id', transactionId).single();

  if (error || !TRANSACTION) {
    throw new NotFoundError('Transaction not found');
  }

  if (TRANSACTION.status !== 'completed') {
    throw new ValidationError('Transaction cannot be refunded');
  }

  const RESULT = await refundPayWayPayment(env, TRANSACTION.payway_tran_id);

  if (RESULT.success) {
    await supabaseAdmin.from('transactions').update({ status: 'refunded', processed_at: new Date().toISOString() }).eq('id', transactionId);
  }

  return { success: RESULT.success };
}
