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