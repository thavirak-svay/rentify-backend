import type { Booking } from "../types/database";
import { BookingTransitionError, ForbiddenError } from "./errors";

export type BookingStatus =
  | "requested"
  | "approved"
  | "declined"
  | "auto_declined"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed"
  | "resolved";

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["approved", "declined", "auto_declined", "cancelled"],
  approved: ["active", "cancelled"],
  declined: [],
  auto_declined: [],
  active: ["completed", "disputed", "cancelled"],
  completed: [],
  cancelled: [],
  disputed: ["resolved"],
  resolved: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(
  from: BookingStatus,
  to: BookingStatus,
  actorId: string,
  booking: Booking
): void {
  if (!canTransition(from, to)) {
    throw new BookingTransitionError(from, to);
  }

  // Role-based guards
  if (to === "approved" || to === "declined") {
    if (actorId !== booking.owner_id) {
      throw new ForbiddenError("Only the owner can approve/decline this booking");
    }
  }

  if (to === "cancelled") {
    if (actorId !== booking.renter_id && actorId !== booking.owner_id) {
      throw new ForbiddenError("Only parties to this booking can cancel");
    }
  }
}
