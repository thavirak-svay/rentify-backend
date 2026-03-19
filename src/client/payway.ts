/**
 * PayWay Payment Gateway Client
 * Encapsulates all external PayWay API requests
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '@/config/env';
import {
  DEFAULT_CURRENCY,
  MERCHANT_ACTION,
  MERCHANT_ENDPOINTS,
  PAYMENT_OPTIONS,
  PAYMENT_TYPES,
  PAYWAY_ENDPOINTS,
  PAYWAY_SUCCESS_CODE,
  PREAUTH_LIFETIME_MINUTES,
} from '@/constants/payment';
import { ExternalServiceError } from '@/shared/lib/errors';
import type { PaymentGateway } from '@/modules/payment/gateway';

// ============================================================================
// Types
// ============================================================================

export interface PayWayBooking {
  id: string;
  listingTitle: string;
  renterFirstName: string;
  renterLastName: string;
  renterEmail: string;
  renterPhone: string;
  ownerId: string;
  ownerPaywayBeneficiaryId: string;
}

export interface PayWayPricing {
  total_renter_pays: number;
  owner_payout: number;
}

export interface PreAuthResult {
  transaction_id: string;
  payway_tran_id: string;
  checkout_url: string;
}

export interface CaptureResult {
  success: boolean;
  grand_total: number;
  transaction_status: string;
}

export interface CancelResult {
  success: boolean;
  transaction_status: string;
}

export interface RefundResult {
  success: boolean;
  total_refunded: number;
  transaction_status: string;
}

export interface TransactionStatus {
  payment_status: string;
  amount: number;
  currency: string;
}

interface PayWayStatus {
  code: string;
  message?: string;
}

interface PayWayResponse {
  status?: PayWayStatus;
  grand_total?: number;
  transaction_status?: string;
  total_refunded?: number;
  data?: { payment_status?: string; amount?: number; currency?: string };
}

// ============================================================================
// PayWay Client
// ============================================================================

export class PayWayClient implements PaymentGateway {
  readonly name = 'payway';

  constructor(private readonly env: Env) {}

  private static hash(apiKey: string, data: string): string {
    return createHash('sha512')
      .update(data + apiKey)
      .digest('base64');
  }

  private static reqTime(): string {
    return new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
  }

  private async request<T extends PayWayResponse>(
    endpoint: string,
    body: Record<string, unknown>,
    operation: string,
    useStatusText = false,
  ): Promise<T> {
    const response = await fetch(`${this.env.PAYWAY_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = useStatusText ? response.statusText : `${response.status} - ${await response.text()}`;
      throw new ExternalServiceError('PayWay', `${operation} failed: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  private static assertSuccess(data: PayWayResponse, operation: string): void {
    if (data.status?.code !== PAYWAY_SUCCESS_CODE) {
      throw new ExternalServiceError('PayWay', `${operation} failed: ${data.status?.message ?? 'Unknown error'}`);
    }
  }

  private static merchantBody(env: Env, tranId: string) {
    const time = PayWayClient.reqTime();
    return {
      request_time: time,
      merchant_id: env.PAYWAY_MERCHANT_ID,
      merchant_auth: env.PAYWAY_MERCHANT_AUTH,
      tran_id: tranId,
      hash: PayWayClient.hash(env.PAYWAY_API_KEY, time + env.PAYWAY_MERCHANT_ID + tranId),
    };
  }

  async createPreAuth(booking: PayWayBooking, pricing: PayWayPricing): Promise<PreAuthResult> {
    const tranId = `RNT${booking.id.replace(/-/g, '').slice(0, 12)}`;
    const time = PayWayClient.reqTime();

    const items = Buffer.from(
      JSON.stringify([
        {
          name: `Rental: ${booking.listingTitle}`,
          quantity: 1,
          price: pricing.total_renter_pays,
        },
      ]),
    ).toString('base64');

    const callbackUrl = Buffer.from(`${this.env.PAYWAY_CALLBACK_URL}/v1/payments/payway-callback`).toString('base64');

    const hashString = `${time}${this.env.PAYWAY_MERCHANT_ID}${tranId}${pricing.total_renter_pays}${items}pre-auth`;

    const response = await this.request(
      PAYWAY_ENDPOINTS.PURCHASE,
      {
        req_time: time,
        merchant_id: this.env.PAYWAY_MERCHANT_ID,
        tran_id: tranId,
        firstname: booking.renterFirstName,
        lastname: booking.renterLastName,
        email: booking.renterEmail,
        phone: booking.renterPhone,
        amount: pricing.total_renter_pays,
        currency: DEFAULT_CURRENCY,
        type: PAYMENT_TYPES.PRE_AUTH,
        payment_option: PAYMENT_OPTIONS.ABAPAY_KHQR,
        items: items,
        callback_url: callbackUrl,
        return_url: `${this.env.APP_URL}/bookings/${booking.id}/payment-result`,
        cancel_url: `${this.env.APP_URL}/bookings/${booking.id}`,
        lifetime: PREAUTH_LIFETIME_MINUTES,
        custom_fields: JSON.stringify({
          booking_id: booking.id,
          owner_id: booking.ownerId,
        }),
        payout: booking.ownerPaywayBeneficiaryId
          ? JSON.stringify([
              {
                acc: booking.ownerPaywayBeneficiaryId,
                amt: (pricing.owner_payout / 100).toFixed(2),
              },
            ])
          : undefined,
        hash: PayWayClient.hash(this.env.PAYWAY_API_KEY, hashString),
      },
      PAYMENT_TYPES.PRE_AUTH,
    );

    return {
      transaction_id: tranId,
      payway_tran_id: tranId,
      checkout_url: response as unknown as string,
    };
  }

  async capture(tranId: string): Promise<CaptureResult> {
    const data = await this.request<PayWayResponse>(
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CAPTURE}`,
      PayWayClient.merchantBody(this.env, tranId),
      MERCHANT_ACTION.CAPTURE,
    );
    PayWayClient.assertSuccess(data, MERCHANT_ACTION.CAPTURE);
    return {
      success: true,
      grand_total: data.grand_total ?? 0,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async cancelPreAuth(tranId: string): Promise<CancelResult> {
    const data = await this.request<PayWayResponse>(
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CANCEL}`,
      PayWayClient.merchantBody(this.env, tranId),
      MERCHANT_ACTION.CANCEL,
    );
    PayWayClient.assertSuccess(data, MERCHANT_ACTION.CANCEL);
    return {
      success: true,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async refund(tranId: string): Promise<RefundResult> {
    const data = await this.request<PayWayResponse>(
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.REFUND}`,
      PayWayClient.merchantBody(this.env, tranId),
      MERCHANT_ACTION.REFUND,
    );
    PayWayClient.assertSuccess(data, MERCHANT_ACTION.REFUND);
    return {
      success: true,
      total_refunded: data.total_refunded ?? 0,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async checkTransaction(tranId: string): Promise<TransactionStatus> {
    const time = PayWayClient.reqTime();
    const body = {
      req_time: time,
      merchant_id: this.env.PAYWAY_MERCHANT_ID,
      tran_id: tranId,
      hash: PayWayClient.hash(this.env.PAYWAY_API_KEY, time + this.env.PAYWAY_MERCHANT_ID + tranId),
    };

    const data = await this.request<PayWayResponse>(PAYWAY_ENDPOINTS.CHECK_TRANSACTION, body, 'check transaction', true);

    return {
      payment_status: data.data?.payment_status ?? 'UNKNOWN',
      amount: data.data?.amount ?? 0,
      currency: data.data?.currency ?? DEFAULT_CURRENCY,
    };
  }

  verifyCallback(payload: Record<string, unknown>): boolean {
    const { hash: receivedHash, ...data } = payload;
    if (typeof receivedHash !== 'string') return false;

    const dataString = Object.keys(data)
      .sort()
      .map((k) => String(data[k]))
      .join('');
    const expected = PayWayClient.hash(this.env.PAYWAY_API_KEY, dataString);

    try {
      const a = Buffer.from(receivedHash);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPayWayClient(env: Env): PayWayClient {
  return new PayWayClient(env);
}