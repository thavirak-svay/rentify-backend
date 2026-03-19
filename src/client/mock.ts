/**
 * Mock Payment Client
 * Mock implementation for testing and development
 */
import type { Env } from '@/config/env';
import { TRANSACTION_STATUS } from '@/constants/payment';
import type {
  PayWayBooking,
  PayWayPricing,
  PreAuthResult,
  CaptureResult,
  CancelResult,
  RefundResult,
  TransactionStatus,
} from './payway';
import type { PaymentGateway } from '@/modules/payment/gateway';

// ============================================================================
// Mock Client
// ============================================================================

export class MockPaymentClient implements PaymentGateway {
  readonly name = 'mock';

  constructor(private readonly _env: Env) {}

  async createPreAuth(_booking: PayWayBooking, _pricing: PayWayPricing): Promise<PreAuthResult> {
    const tranId = `MOCK${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return {
      transaction_id: tranId,
      payway_tran_id: tranId,
      checkout_url: `/mock-payment?tran_id=${tranId}&status=pending`,
    };
  }

  async capture(_tranId: string): Promise<CaptureResult> {
    return {
      success: true,
      grand_total: 0,
      transaction_status: TRANSACTION_STATUS.COMPLETED,
    };
  }

  async cancelPreAuth(_tranId: string): Promise<CancelResult> {
    return {
      success: true,
      transaction_status: TRANSACTION_STATUS.CANCELLED,
    };
  }

  async refund(_tranId: string): Promise<RefundResult> {
    return {
      success: true,
      total_refunded: 0,
      transaction_status: TRANSACTION_STATUS.REFUNDED,
    };
  }

  async checkTransaction(_tranId: string): Promise<TransactionStatus> {
    return {
      payment_status: TRANSACTION_STATUS.PENDING,
      amount: 0,
      currency: 'USD',
    };
  }

  verifyCallback(_payload: Record<string, unknown>): boolean {
    return true;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMockPaymentClient(env: Env): MockPaymentClient {
  return new MockPaymentClient(env);
}