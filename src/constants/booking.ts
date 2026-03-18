/**
 * Booking Constants
 * Centralized booking configuration for Rentify marketplace
 */

export const BOOKING_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  DECLINED: 'declined',
  AUTO_DECLINED: 'auto_declined',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  RESOLVED: 'resolved',
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const AUTO_DECLINE_TIMEOUT_HOURS = 24;

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ['approved', 'declined', 'auto_declined', 'cancelled'],
  approved: ['active', 'cancelled'],
  declined: [],
  auto_declined: [],
  active: ['completed', 'cancelled', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['resolved'],
  resolved: [],
};

export const TRANSITION_ROLES = {
  requested__approved: ['owner'],
  requested__declined: ['owner'],
  requested__cancelled: ['renter', 'owner'],
  approved__active: ['owner'],
  approved__cancelled: ['renter', 'owner'],
  active__completed: ['owner'],
  active__cancelled: ['renter', 'owner'],
  active__disputed: ['renter', 'owner'],
  disputed__resolved: ['admin'],
} as const;
