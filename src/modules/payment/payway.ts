/**
 * PayWay Payment Gateway Implementation
 * Concrete implementation of PaymentGateway for ABA PayWay (Cambodia)
 *
 * @module modules/payment/payway
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '@/config/env';
import { DEFAULT_CURRENCY, MERCHANT_ENDPOINTS, PAYWAY_ENDPOINTS, PAYWAY_SUCCESS_CODE, PREAUTH_LIFETIME_MINUTES } from '@/constants';
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
    const RESPONSE = await fetch(`${env.PAYWAY_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!RESPONSE.ok) {
      const ERROR = useStatusText ? RESPONSE.statusText : `${RESPONSE.status} - ${await RESPONSE.text()}`;
      throw new ExternalServiceError('PayWay', `${operation} failed: ${ERROR}`);
    }

    return RESPONSE.json() as Promise<T>;
  }

  private static assertSuccess(data: PayWayResponse, operation: string): void {
    if (data.status?.code !== PAYWAY_SUCCESS_CODE) {
      throw new ExternalServiceError('PayWay', `${operation} failed: ${data.status?.message ?? 'Unknown error'}`);
    }
  }

  private static merchantBody(env: Env, tranId: string) {
    const TIME = PayWayGateway.reqTime();
    return {
      request_time: TIME,
      merchant_id: env.PAYWAY_MERCHANT_ID,
      merchant_auth: env.PAYWAY_MERCHANT_AUTH,
      tran_id: tranId,
      hash: PayWayGateway.hash(env.PAYWAY_API_KEY, TIME + env.PAYWAY_MERCHANT_ID + tranId),
    };
  }

  async createPreAuth(env: Env, booking: PaymentBooking, pricing: PaymentPricing): Promise<PreAuthResult> {
    const TRAN_ID = `RNT${booking.id.replace(/-/g, '').slice(0, 12)}`;
    const TIME = PayWayGateway.reqTime();

    const ITEMS = Buffer.from(
      JSON.stringify([
        {
          name: `Rental: ${booking.listingTitle}`,
          quantity: 1,
          price: pricing.total_renter_pays,
        },
      ]),
    ).toString('base64');

    const CALLBACK_URL = Buffer.from(`${env.PAYWAY_CALLBACK_URL}/v1/payments/payway-callback`).toString('base64');

    const HASH_STRING = `${TIME}${env.PAYWAY_MERCHANT_ID}${TRAN_ID}${pricing.total_renter_pays}${ITEMS}pre-auth`;

    const RESPONSE = await this.request(
      env,
      PAYWAY_ENDPOINTS.PURCHASE,
      {
        req_time: TIME,
        merchant_id: env.PAYWAY_MERCHANT_ID,
        tran_id: TRAN_ID,
        firstname: booking.renterFirstName,
        lastname: booking.renterLastName,
        email: booking.renterEmail,
        phone: booking.renterPhone,
        amount: pricing.total_renter_pays,
        currency: DEFAULT_CURRENCY,
        type: 'pre-auth',
        payment_option: 'abapay_khqr',
        items: ITEMS,
        callback_url: CALLBACK_URL,
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
        hash: PayWayGateway.hash(env.PAYWAY_API_KEY, HASH_STRING),
      },
      'pre-auth',
    );

    return {
      transaction_id: TRAN_ID,
      payway_tran_id: TRAN_ID,
      checkout_url: RESPONSE as unknown as string,
    };
  }

  async capture(env: Env, tranId: string): Promise<CaptureResult> {
    const DATA = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CAPTURE}`,
      PayWayGateway.merchantBody(env, tranId),
      'capture',
    );
    PayWayGateway.assertSuccess(DATA, 'capture');
    return {
      success: true,
      grand_total: DATA.grand_total ?? 0,
      transaction_status: DATA.transaction_status ?? 'unknown',
    };
  }

  async cancelPreAuth(env: Env, tranId: string): Promise<CancelResult> {
    const DATA = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.CANCEL}`,
      PayWayGateway.merchantBody(env, tranId),
      'cancel',
    );
    PayWayGateway.assertSuccess(DATA, 'cancel');
    return {
      success: true,
      transaction_status: DATA.transaction_status ?? 'unknown',
    };
  }

  async refund(env: Env, tranId: string): Promise<RefundResult> {
    const DATA = await this.request<PayWayResponse>(
      env,
      `/api/merchant-portal/merchant-access/online-transaction/${MERCHANT_ENDPOINTS.REFUND}`,
      PayWayGateway.merchantBody(env, tranId),
      'refund',
    );
    PayWayGateway.assertSuccess(DATA, 'refund');
    return {
      success: true,
      total_refunded: DATA.total_refunded ?? 0,
      transaction_status: DATA.transaction_status ?? 'unknown',
    };
  }

  async checkTransaction(env: Env, tranId: string): Promise<TransactionStatus> {
    const TIME = PayWayGateway.reqTime();
    const BODY = {
      req_time: TIME,
      merchant_id: env.PAYWAY_MERCHANT_ID,
      tran_id: tranId,
      hash: PayWayGateway.hash(env.PAYWAY_API_KEY, TIME + env.PAYWAY_MERCHANT_ID + tranId),
    };

    const DATA = await this.request<PayWayResponse>(env, PAYWAY_ENDPOINTS.CHECK_TRANSACTION, BODY, 'check transaction', true);

    return {
      payment_status: DATA.data?.payment_status ?? 'UNKNOWN',
      amount: DATA.data?.amount ?? 0,
      currency: DATA.data?.currency ?? DEFAULT_CURRENCY,
    };
  }

  verifyCallback(env: Env, payload: Record<string, unknown>): boolean {
    const { hash: RECEIVED_HASH, ...DATA } = payload;
    if (typeof RECEIVED_HASH !== 'string') return false;

    const DATA_STRING = Object.keys(DATA)
      .sort()
      .map((k) => String(DATA[k]))
      .join('');
    const EXPECTED = PayWayGateway.hash(env.PAYWAY_API_KEY, DATA_STRING);

    try {
      const A = Buffer.from(RECEIVED_HASH);
      const B = Buffer.from(EXPECTED);
      return A.length === B.length && timingSafeEqual(A, B);
    } catch {
      return false;
    }
  }
}
