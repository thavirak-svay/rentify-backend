import { PROTECTION_PLAN } from '@/constants/payment';

export const MAX_RENTAL_DAYS = 90;

export const MS_PER_HOUR = 1000 * 60 * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;

export const PROTECTION_RATES = {
  [PROTECTION_PLAN.NONE]: 0,
  [PROTECTION_PLAN.BASIC]: 0.05,
  [PROTECTION_PLAN.PREMIUM]: 0.1,
} as const;

export type ProtectionPlan = keyof typeof PROTECTION_RATES;

export const SERVICE_FEE_RATE = 0.12;
export const OWNER_COMMISSION_RATE = 0.06;

export const HOURLY_THRESHOLD_HOURS = 8;
export const WEEKLY_THRESHOLD_DAYS = 5;

export const DAYS_PER_WEEK = 7;
export const HOURS_PER_DAY = 24;