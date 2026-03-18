/**
 * Compensation Constants
 * Centralized compensation queue configuration
 */

export const COMPENSATION_TYPES = {
  CANCEL_PREAUTH: 'cancel_preauth',
  REFUND: 'refund',
  CANCEL_BOOKING: 'cancel_booking',
  CAPTURE: 'capture',
} as const;

export type CompensationType = (typeof COMPENSATION_TYPES)[keyof typeof COMPENSATION_TYPES];

export const COMPENSATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 5000;
