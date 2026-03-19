import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '@/config/env';
import { TRANSACTION_STATUS } from '@/constants/payment';
import { getPaymentGateway } from '@/modules/payment/factory';
import { DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { log } from '@/shared/middleware/logger';

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
  const gateway = getPaymentGateway(env);
  if (!gateway.verifyCallback({ ...payload })) {
    throw new ForbiddenError('Invalid payment callback hash');
  }

  const { tran_id, status } = payload;

  const newStatus = status === 'APPROVED' ? TRANSACTION_STATUS.AUTHORIZED : TRANSACTION_STATUS.FAILED;

  const { data: updatedTx, error: updateError } = await supabaseAdmin
    .from('transactions')
    .update({
      status: newStatus,
      metadata: { payway_callback: payload },
    })
    .eq('payway_tran_id', tran_id)
    .eq('status', TRANSACTION_STATUS.PENDING)
    .select('id, booking_id, status');

  if (updateError) {
    log.error({ err: updateError, tran_id }, 'Failed to update transaction');
    throw new DatabaseError('Failed to process payment callback', updateError);
  }

  if (!updatedTx || updatedTx.length === 0) {
    log.info({ tran_id, status }, 'PayWay callback already processed, skipping');
    return;
  }

  const existingTx = updatedTx[0];
  if (!existingTx) {
    return;
  }

  log.info({ tran_id, status, booking_id: existingTx.booking_id }, 'PayWay callback processed');

  if (status === 'APPROVED') {
    await supabaseAdmin.from('bookings').update({ payment_authorized: true }).eq('id', existingTx.booking_id);
  }
}

export async function getTransactionStatus(supabaseAdmin: SupabaseClient, env: Env, transactionId: string): Promise<TransactionStatusResult> {
  const { data: transaction, error } = await supabaseAdmin.from('transactions').select('payway_tran_id').eq('id', transactionId).single();

  if (error || !transaction?.payway_tran_id) {
    throw new NotFoundError('Transaction not found');
  }

  const gateway = getPaymentGateway(env);
  return gateway.checkTransaction(transaction.payway_tran_id);
}

export async function refundTransaction(supabaseAdmin: SupabaseClient, env: Env, transactionId: string): Promise<RefundResult> {
  const { data: transaction, error } = await supabaseAdmin.from('transactions').select('payway_tran_id, status').eq('id', transactionId).single();

  if (error || !transaction) {
    throw new NotFoundError('Transaction not found');
  }

  if (transaction.status !== TRANSACTION_STATUS.COMPLETED) {
    throw new ValidationError('Transaction cannot be refunded');
  }

  const gateway = getPaymentGateway(env);
  const result = await gateway.refund(transaction.payway_tran_id);

  if (result.success) {
    await supabaseAdmin
      .from('transactions')
      .update({ status: TRANSACTION_STATUS.REFUNDED, processed_at: new Date().toISOString() })
      .eq('id', transactionId);
  }

  return { success: result.success };
}
