import { BOOKING_STATUS, type BookingStatus, SYSTEM_ONLY_STATUSES, VALID_TRANSITIONS } from '@/constants/booking';
export type { BookingStatus };

import { BookingTransitionError, ForbiddenError } from '@/shared/lib/errors';
import type { Booking } from '@/generated/database';

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function isSystemActor(actorId: string): boolean {
  return actorId === 'system' || actorId.startsWith('system');
}

function validateSystemOnlyTransition(to: BookingStatus, actorId: string): void {
  if (SYSTEM_ONLY_STATUSES.includes(to) && !isSystemActor(actorId)) {
    throw new ForbiddenError('This transition can only be performed by the system');
  }
}

function validateOwnerOnlyTransition(to: BookingStatus, actorId: string, booking: Booking): void {
  if ((to === BOOKING_STATUS.APPROVED || to === BOOKING_STATUS.DECLINED) && actorId !== booking.owner_id) {
    throw new ForbiddenError('Only the owner can approve/decline this booking');
  }
}

function validateCancellationTransition(to: BookingStatus, actorId: string, booking: Booking): void {
  if (to === BOOKING_STATUS.CANCELLED && actorId !== booking.renter_id && actorId !== booking.owner_id) {
    throw new ForbiddenError('Only parties to this booking can cancel');
  }
}

export function validateTransition(from: BookingStatus, to: BookingStatus, actorId: string, booking: Booking): void {
  if (!canTransition(from, to)) {
    throw new BookingTransitionError(from, to);
  }

  validateSystemOnlyTransition(to, actorId);
  validateOwnerOnlyTransition(to, actorId, booking);
  validateCancellationTransition(to, actorId, booking);
}
