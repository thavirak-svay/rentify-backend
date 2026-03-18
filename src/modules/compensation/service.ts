/**
 * Compensation Module - Service
 * Handles compensation queue for failed operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../config/env';
import { COMPENSATION_TYPES, type CompensationType } from '../../constants';
import { getPaymentGateway } from '../payment';

interface CompensationPayload {
  payway_tran_id?: string;
  booking_id?: string;
}

interface CompensationItem {
  id: string;
  type: CompensationType;
  payload: CompensationPayload;
  booking_id: string | null;
  retry_count: number;
}

const LOG = {
  info: (_data: Record<string, unknown>, _msg: string) => Promise.resolve(),
  error: (_data: Record<string, unknown>, _msg: string) => Promise.resolve(),
};

export class CompensationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async queue(type: CompensationType, payload: CompensationPayload, bookingId?: string, transactionId?: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('queue_compensation', {
      p_type: type,
      p_payload: payload,
      p_booking_id: bookingId ?? null,
      p_transaction_id: transactionId ?? null,
    });

    if (error) {
      LOG.error({ err: error, type }, 'Failed to queue compensation');
      throw error;
    }

    LOG.info({ compensationId: data, type, bookingId }, 'Compensation queued');
    return data;
  }

  async processQueue(env: Env): Promise<{ processed: number; failed: number }> {
    const { data: ITEMS } = await this.supabase.rpc('get_next_compensation');
    if (!ITEMS?.length) return { processed: 0, failed: 0 };

    const ITEM = ITEMS[0] as unknown as CompensationItem;
    await this.supabase.rpc('mark_compensation_processing', { p_id: ITEM.id });

    try {
      await this.processItem(env, ITEM);
      await this.supabase.rpc('mark_compensation_completed', { p_id: ITEM.id });
      LOG.info({ compensationId: ITEM.id, type: ITEM.type }, 'Compensation completed');
      return { processed: 1, failed: 0 };
    } catch (err) {
      const MESSAGE = err instanceof Error ? err.message : 'Unknown error';
      await this.supabase.rpc('mark_compensation_failed', { p_id: ITEM.id, p_error: MESSAGE });
      LOG.error({ err, item: ITEM }, 'Compensation failed');
      return { processed: 0, failed: 1 };
    }
  }

  private async processItem(env: Env, item: CompensationItem): Promise<void> {
    const { type, payload } = item;
    const GATEWAY = getPaymentGateway();

    if (type === COMPENSATION_TYPES.CANCEL_PREAUTH) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await GATEWAY.cancelPreAuth(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.REFUND) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await GATEWAY.refund(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.CAPTURE) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await GATEWAY.capture(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.CANCEL_BOOKING) {
      if (!item.booking_id) throw new Error('Missing booking_id');
      await this.supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', item.booking_id);
      return;
    }

    throw new Error(`Unknown compensation type: ${type}`);
  }

  async getFailed(): Promise<Array<{ id: string; type: string; payload: unknown; last_error: string }>> {
    const { data, error } = await this.supabase
      .from('compensation_queue')
      .select('id, type, payload, last_error')
      .eq('status', 'failed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

export async function queueCompensation(
  supabase: SupabaseClient,
  type: CompensationType,
  payload: CompensationPayload,
  bookingId?: string,
  transactionId?: string,
): Promise<string> {
  const SERVICE = new CompensationService(supabase);
  return await SERVICE.queue(type, payload, bookingId, transactionId);
}

export async function processCompensationQueue(supabase: SupabaseClient, env: Env): Promise<{ processed: number; failed: number }> {
  const SERVICE = new CompensationService(supabase);
  return await SERVICE.processQueue(env);
}

export async function getFailedCompensations(supabase: SupabaseClient) {
  const SERVICE = new CompensationService(supabase);
  return await SERVICE.getFailed();
}
