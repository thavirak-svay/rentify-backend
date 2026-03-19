import { ForbiddenError } from './errors';

/**
 * Require that a user owns a resource.
 * Throws ForbiddenError if not.
 */
export function requireOwnership(
  entity: { owner_id: string },
  userId: string,
  entityType = 'resource',
): void {
  if (entity.owner_id !== userId) {
    throw new ForbiddenError(`You can only modify your own ${entityType}`);
  }
}

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

/**
 * Require that a user is a participant in a thread.
 * Throws ForbiddenError if not.
 */
export function requireThreadParticipant(thread: { participant_ids: string[] }, userId: string): void {
  if (!thread.participant_ids.includes(userId)) {
    throw new ForbiddenError('You are not a participant in this thread');
  }
}