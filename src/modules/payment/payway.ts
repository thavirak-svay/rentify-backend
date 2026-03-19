import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '@/config/env';
import {
  DEFAULT_CURRENCY,
  MERCHANT_ENDPOINTS,
  PAYMENT_OPTIONS,
  PAYMENT_TYPES,
  PAYWAY_ENDPOINTS,
  PAYWAY_SUCCESS_CODE,
  PREAUTH_LIFETIME_MINUTES,
} from '@/constants';
import { ExternalServiceError } from '@/shared/lib/errors';
import type {
  CancelResult,
  CaptureResult,
  PaymentBooking,
  PaymentGateway,
  PaymentPricing,
  PreAuthResult,
  RefundResult,
  TransactionStatus,
} from './gateway';

/**
 * PayWay API response types
 */
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

export class PayWayGateway implements PaymentGateway {
  readonly name = 'payway';

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
    env: Env,
    endpoint: string,
    body: Record<string, unknown>,
    operation: string,
    useStatusText = false,
  ): Promise<T> {
    const response = await fetch(`${env.PAYWAY_BASE_URL}${endpoint}`, {
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
    const time = PayWayGateway.reqTime();
    return {
      request_time: time,
      merchant_id: env.PAYWAY_MERCHANT_ID,
      merchant_auth: env.PAYWAY_MERCHANT_AUTH,
      tran_id: tranId,
      hash: PayWayGateway.hash(env.PAYWAY_API_KEY, time + env.PAYWAY_MERCHANT_ID + tranId),
    };
  }

  async createPreAuth(env: Env, booking: PaymentBooking, pricing: PaymentPricing): Promise<PreAuthResult> {
    const tranId = `RNT${booking.id.replace(/-/g, '').slice(0, 12)}`;
    const time = PayWayGateway.reqTime();

    const items = Buffer.from(
      JSON.stringify([
        {
          name: `Rental: ${booking.listingTitle}`,
          quantity: 1,
          price: pricing.total_renter_pays,
        },
      ]),
    ).toString('base64');

    const callbackUrl = Buffer.from(`${env.PAYWAY_CALLBACK_URL}/v1/payments/payway-callback`).toString('base64');

    const hashString = `${time}${env.PAYWAY_MERCHANT_ID}${tranId}${pricing.total_renter_pays}${items}pre-auth`;

    const response = await this.request(
      env,
      PAYWAY_ENDPOINTS.PURCHASE,
      {
        req_time: time,
        merchant_id: env.PAYWAY_MERCHANT_ID,
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
        return_url: `${env.APP_URL}/bookings/${booking.id}/payment-result`,
        cancel_url: `${env.APP_URL}/bookings/${booking.id}`,
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
        hash: PayWayGateway.hash(env.PAYWAY_API_KEY, hashString),
      },
      PAYMENT_TYPES.PRE_AUTH,
    );

    return {
      transaction_id: tranId,
      payway_tran_id: tranId,
      checkout_url: response as unknown as string,
    };
  }

  async capture(env: Env, tranId: string): Promise<CaptureResult> {
    const data = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CAPTURE}`,
      PayWayGateway.merchantBody(env, tranId),
      'capture',
    );
    PayWayGateway.assertSuccess(data, 'capture');
    return {
      success: true,
      grand_total: data.grand_total ?? 0,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async cancelPreAuth(env: Env, tranId: string): Promise<CancelResult> {
    const data = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CANCEL}`,
      PayWayGateway.merchantBody(env, tranId),
      'cancel',
    );
    PayWayGateway.assertSuccess(data, 'cancel');
    return {
      success: true,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async refund(env: Env, tranId: string): Promise<RefundResult> {
    const data = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.REFUND}`,
      PayWayGateway.merchantBody(env, tranId),
      'refund',
    );
    PayWayGateway.assertSuccess(data, 'refund');
    return {
      success: true,
      total_refunded: data.total_refunded ?? 0,
      transaction_status: data.transaction_status ?? 'unknown',
    };
  }

  async checkTransaction(env: Env, tranId: string): Promise<TransactionStatus> {
    const time = PayWayGateway.reqTime();
    const body = {
      req_time: time,
      merchant_id: env.PAYWAY_MERCHANT_ID,
      tran_id: tranId,
      hash: PayWayGateway.hash(env.PAYWAY_API_KEY, time + env.PAYWAY_MERCHANT_ID + tranId),
    };

    const data = await this.request<PayWayResponse>(env, PAYWAY_ENDPOINTS.CHECK_TRANSACTION, body, 'check transaction', true);

    return {
      payment_status: data.data?.payment_status ?? 'UNKNOWN',
      amount: data.data?.amount ?? 0,
      currency: data.data?.currency ?? DEFAULT_CURRENCY,
    };
  }

  verifyCallback(env: Env, payload: Record<string, unknown>): boolean {
    const { hash: receivedHash, ...data } = payload;
    if (typeof receivedHash !== 'string') return false;

    const dataString = Object.keys(data)
      .sort()
      .map((k) => String(data[k]))
      .join('');
    const expected = PayWayGateway.hash(env.PAYWAY_API_KEY, dataString);

    try {
      const a = Buffer.from(receivedHash);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
