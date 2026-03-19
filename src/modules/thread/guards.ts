import { ForbiddenError } from '@/shared/lib/errors';

/**
 * Require that a user is a participant in a thread.
 * Throws ForbiddenError if not.
 */
export function requireThreadParticipant(thread: { participant_ids: string[] }, userId: string): void {
  if (!thread.participant_ids.includes(userId)) {
    throw new ForbiddenError('You are not a participant in this thread');
  }
}