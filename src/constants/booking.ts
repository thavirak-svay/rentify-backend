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
  REQUESTED_TO_APPROVED: ['owner'],
  REQUESTED_TO_DECLINED: ['owner'],
  REQUESTED_TO_CANCELLED: ['renter', 'owner'],
  APPROVED_TO_ACTIVE: ['owner'],
  APPROVED_TO_CANCELLED: ['renter', 'owner'],
  ACTIVE_TO_COMPLETED: ['owner'],
  ACTIVE_TO_CANCELLED: ['renter', 'owner'],
  ACTIVE_TO_DISPUTED: ['renter', 'owner'],
  DISPUTED_TO_RESOLVED: ['admin'],
} as const;
