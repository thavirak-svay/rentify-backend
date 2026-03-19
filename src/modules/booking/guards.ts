import { ForbiddenError } from '@/shared/lib/errors';

/**
 * Require that a user is a participant (renter or owner) of a booking.
 * Throws ForbiddenError if not.
 */
export function requireBookingParticipant(
  booking: { renter_id: string; owner_id: string },
  userId: string,
): void {
  if (booking.renter_id !== userId && booking.owner_id !== userId) {
    throw new ForbiddenError('You can only access your own bookings');
  }
}

/**
 * Require that a user is the owner of a booking.
 * Throws ForbiddenError if not.
 */
export function requireBookingOwner(booking: { owner_id: string }, userId: string): void {
  if (booking.owner_id !== userId) {
    throw new ForbiddenError('Only the owner can perform this action');
  }
}

/**
 * Require that a user is the renter of a booking.
 * Throws ForbiddenError if not.
 */
export function requireBookingRenter(booking: { renter_id: string }, userId: string): void {
  if (booking.renter_id !== userId) {
    throw new ForbiddenError('Only the renter can perform this action');
  }
}