import { createHash } from "crypto";
import type { Env } from "../config/env";

function generateHash(apiKey: string, data: string): string {
  return createHash("sha512").update(data + apiKey).digest("base64");
}

function formatReqTime(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

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

export async function createPreAuth(
  env: Env,
  booking: PayWayBooking,
  pricing: PayWayPricing
): Promise<PreAuthResult> {
  const tranId = `RNT${booking.id.replace(/-/g, "").slice(0, 12)}`;
  const reqTime = formatReqTime();

  const items = Buffer.from(
    JSON.stringify([
      {
        name: `Rental: ${booking.listingTitle}`,
        quantity: 1,
        price: pricing.total_renter_pays,
      },
    ])
  ).toString("base64");

  const callbackUrl = Buffer.from(
    `${env.PAYWAY_CALLBACK_URL}/v1/payments/payway-callback`
  ).toString("base64");

  const hashString =
    reqTime + env.PAYWAY_MERCHANT_ID + tranId + pricing.total_renter_pays.toString() + items + "pre-auth";

  const body = {
    req_time: reqTime,
    merchant_id: env.PAYWAY_MERCHANT_ID,
    tran_id: tranId,
    firstname: booking.renterFirstName,
    lastname: booking.renterLastName,
    email: booking.renterEmail,
    phone: booking.renterPhone,
    amount: pricing.total_renter_pays,
    currency: "USD",
    type: "pre-auth",
    payment_option: "abapay_khqr",
    items,
    callback_url: callbackUrl,
    return_url: `${env.APP_URL}/bookings/${booking.id}/payment-result`,
    cancel_url: `${env.APP_URL}/bookings/${booking.id}`,
    lifetime: 30,
    custom_fields: JSON.stringify({ booking_id: booking.id, owner_id: booking.ownerId }),
    payout: JSON.stringify([
      {
        acc: booking.ownerPaywayBeneficiaryId,
        amt: (pricing.owner_payout / 100).toFixed(2),
      },
    ]),
    hash: generateHash(env.PAYWAY_API_KEY, hashString),
  };

  const response = await fetch(`${env.PAYWAY_BASE_URL}/api/payment-gateway/v1/payments/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PayWay pre-auth failed: ${response.statusText}`);
  }

  const checkoutHtml = await response.text();

  return {
    transaction_id: tranId,
    payway_tran_id: tranId,
    checkout_url: checkoutHtml,
  };
}

export async function captureWithPayout(
  env: Env,
  paywayTranId: string
): Promise<{
  success: boolean;
  grand_total: number;
  transaction_status: string;
}> {
  const reqTime = formatReqTime();

  const body = {
    request_time: reqTime,
    merchant_id: env.PAYWAY_MERCHANT_ID,
    merchant_auth: env.PAYWAY_MERCHANT_AUTH,
    tran_id: paywayTranId,
    hash: generateHash(env.PAYWAY_API_KEY, reqTime + env.PAYWAY_MERCHANT_ID + paywayTranId),
  };

  const response = await fetch(
    `${env.PAYWAY_BASE_URL}/api/merchant-portal/merchant-access/online-transaction/pre-auth-completion`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`PayWay capture failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status?.code !== "00") {
    throw new Error(`PayWay capture failed: ${data.status?.message || "Unknown error"}`);
  }

  return {
    success: true,
    grand_total: data.grand_total,
    transaction_status: data.transaction_status,
  };
}

export async function cancelPreAuth(
  env: Env,
  paywayTranId: string
): Promise<{
  success: boolean;
  transaction_status: string;
}> {
  const reqTime = formatReqTime();

  const body = {
    request_time: reqTime,
    merchant_id: env.PAYWAY_MERCHANT_ID,
    merchant_auth: env.PAYWAY_MERCHANT_AUTH,
    tran_id: paywayTranId,
    hash: generateHash(env.PAYWAY_API_KEY, reqTime + env.PAYWAY_MERCHANT_ID + paywayTranId),
  };

  const response = await fetch(
    `${env.PAYWAY_BASE_URL}/api/merchant-portal/merchant-access/online-transaction/cancel-pre-purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`PayWay cancel failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    success: data.status?.code === "00",
    transaction_status: data.transaction_status,
  };
}

export async function refundPayment(
  env: Env,
  paywayTranId: string
): Promise<{
  success: boolean;
  total_refunded: number;
  transaction_status: string;
}> {
  const reqTime = formatReqTime();

  const body = {
    request_time: reqTime,
    merchant_id: env.PAYWAY_MERCHANT_ID,
    merchant_auth: env.PAYWAY_MERCHANT_AUTH,
    tran_id: paywayTranId,
    hash: generateHash(env.PAYWAY_API_KEY, reqTime + env.PAYWAY_MERCHANT_ID + paywayTranId),
  };

  const response = await fetch(
    `${env.PAYWAY_BASE_URL}/api/merchant-portal/merchant-access/online-transaction/refund`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`PayWay refund failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    success: data.status?.code === "00",
    total_refunded: data.total_refunded,
    transaction_status: data.transaction_status,
  };
}

export async function checkTransaction(
  env: Env,
  paywayTranId: string
): Promise<{
  payment_status: string;
  amount: number;
  currency: string;
}> {
  const reqTime = formatReqTime();

  const body = {
    req_time: reqTime,
    merchant_id: env.PAYWAY_MERCHANT_ID,
    tran_id: paywayTranId,
    hash: generateHash(env.PAYWAY_API_KEY, reqTime + env.PAYWAY_MERCHANT_ID + paywayTranId),
  };

  const response = await fetch(
    `${env.PAYWAY_BASE_URL}/api/payment-gateway/v1/payments/check-transaction-2`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`PayWay check transaction failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    payment_status: data.data?.payment_status || "UNKNOWN",
    amount: data.data?.amount || 0,
    currency: data.data?.currency || "USD",
  };
}

export function verifyCallbackHash(env: Env, payload: Record<string, unknown>): boolean {
  const { hash, ...data } = payload;
  const dataString = Object.keys(data)
    .sort()
    .map((key) => String(data[key]))
    .join("");

  const expectedHash = generateHash(env.PAYWAY_API_KEY, dataString);
  return hash === expectedHash;
}
