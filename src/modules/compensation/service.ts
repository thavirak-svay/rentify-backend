/**
 * Compensation Module - Service
 * Handles compensation queue for failed operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '@/config/env';
import { BOOKING_STATUS, COMPENSATION_STATUS, COMPENSATION_TYPES, type CompensationType } from '@/constants';
import { getPaymentGateway } from '@/modules/payment';

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

const log = {
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
      log.error({ err: error, type }, 'Failed to queue compensation');
      throw error;
    }

    log.info({ compensationId: data, type, bookingId }, 'Compensation queued');
    return data;
  }

  async processQueue(env: Env): Promise<{ processed: number; failed: number }> {
    const { data: items } = await this.supabase.rpc('get_next_compensation');
    if (!items?.length) return { processed: 0, failed: 0 };

    const item = items[0] as unknown as CompensationItem;
    await this.supabase.rpc('mark_compensation_processing', { p_id: item.id });

    try {
      await this.processItem(env, item);
      await this.supabase.rpc('mark_compensation_completed', { p_id: item.id });
      log.info({ compensationId: item.id, type: item.type }, 'Compensation completed');
      return { processed: 1, failed: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.supabase.rpc('mark_compensation_failed', { p_id: item.id, p_error: message });
      log.error({ err, item: item }, 'Compensation failed');
      return { processed: 0, failed: 1 };
    }
  }

  private async processItem(env: Env, item: CompensationItem): Promise<void> {
    const { type, payload } = item;
    const gateway = getPaymentGateway();

    if (type === COMPENSATION_TYPES.CANCEL_PREAUTH) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await gateway.cancelPreAuth(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.REFUND) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await gateway.refund(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.CAPTURE) {
      if (!payload.payway_tran_id) throw new Error('Missing payway_tran_id');
      await gateway.capture(env, payload.payway_tran_id);
      return;
    }

    if (type === COMPENSATION_TYPES.CANCEL_BOOKING) {
      if (!item.booking_id) throw new Error('Missing booking_id');
      await this.supabase
        .from('bookings')
        .update({ status: BOOKING_STATUS.CANCELLED, cancelled_at: new Date().toISOString() })
        .eq('id', item.booking_id);
      return;
    }

    throw new Error(`Unknown compensation type: ${type}`);
  }

  async getFailed(): Promise<Array<{ id: string; type: string; payload: unknown; last_error: string }>> {
    const { data, error } = await this.supabase
      .from('compensation_queue')
      .select('id, type, payload, last_error')
      .eq('status', COMPENSATION_STATUS.FAILED)
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
  const service = new CompensationService(supabase);
  return await service.queue(type, payload, bookingId, transactionId);
}

export async function processCompensationQueue(supabase: SupabaseClient, env: Env): Promise<{ processed: number; failed: number }> {
  const service = new CompensationService(supabase);
  return await service.processQueue(env);
}

export async function getFailedCompensations(supabase: SupabaseClient) {
  const service = new CompensationService(supabase);
  return await service.getFailed();
}
