export const PAYWAY_ENDPOINTS = {
  PURCHASE: '/api/payment-gateway/v1/payments/purchase',
  CHECK_TRANSACTION: '/api/payment-gateway/v1/payments/check-transaction-2',
} as const;

export const MERCHANT_ENDPOINTS = {
  CAPTURE: 'pre-auth-completion',
  CANCEL: 'cancel-pre-purchase',
  REFUND: 'refund',
} as const;

export const PAYMENT_TYPES = {
  PRE_AUTH: 'pre-auth',
  PURCHASE: 'purchase',
} as const;

export const PAYMENT_OPTIONS = {
  ABAPAY_KHQR: 'abapay_khqr',
  CARDS: 'cards',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export const PAYWAY_TRANSACTION_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const TRANSACTION_TYPE = {
  PRE_AUTH: 'pre_auth',
  CAPTURE: 'capture',
  PAYOUT: 'payout',
  REFUND: 'refund',
  PARTIAL_REFUND: 'partial_refund',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const IDENTITY_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type IdentityStatusType = (typeof IDENTITY_STATUS)[keyof typeof IDENTITY_STATUS];

export const DELIVERY_METHOD = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
} as const;

export type DeliveryMethodType = (typeof DELIVERY_METHOD)[keyof typeof DELIVERY_METHOD];

export const PROTECTION_PLAN = {
  NONE: 'none',
  BASIC: 'basic',
  PREMIUM: 'premium',
} as const;

export type ProtectionPlanType = (typeof PROTECTION_PLAN)[keyof typeof PROTECTION_PLAN];

export const PREAUTH_LIFETIME_MINUTES = 30;

export const DEFAULT_CURRENCY = 'USD';

export const PAYWAY_SUCCESS_CODE = '00';
