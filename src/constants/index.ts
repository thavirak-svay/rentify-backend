/**
 * Constants Index
 * Centralized export for all Rentify constants
 *
 * @example
 * import { MAX_RENTAL_DAYS, BOOKING_STATUS, PAYWAY_SUCCESS_CODE } from "@/constants"
 */

export {
  AUTO_DECLINE_TIMEOUT_HOURS,
  BOOKING_STATUS,
  type BookingStatus,
  TRANSITION_ROLES,
  VALID_TRANSITIONS,
} from './booking';
export {
  COMPENSATION_STATUS,
  COMPENSATION_TYPES,
  type CompensationType,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
} from './compensation';

export {
  DEFAULT_CURRENCY,
  MERCHANT_ENDPOINTS,
  PAYMENT_OPTIONS,
  PAYMENT_TYPES,
  PAYWAY_ENDPOINTS,
  PAYWAY_SUCCESS_CODE,
  PAYWAY_TRANSACTION_STATUS,
  PREAUTH_LIFETIME_MINUTES,
} from './payment';
export {
  HOURLY_THRESHOLD_HOURS,
  MAX_RENTAL_DAYS,
  MS_PER_DAY,
  MS_PER_HOUR,
  OWNER_COMMISSION_RATE,
  PROTECTION_RATES,
  type ProtectionPlan,
  SERVICE_FEE_RATE,
  WEEKLY_THRESHOLD_DAYS,
} from './pricing';
