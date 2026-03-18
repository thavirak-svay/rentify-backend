/**
 * Payment Constants
 * Centralized payment configuration for Rentify marketplace
 */

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

export const PAYWAY_TRANSACTION_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const PREAUTH_LIFETIME_MINUTES = 30;

export const DEFAULT_CURRENCY = 'USD';

export const PAYWAY_SUCCESS_CODE = '00';
