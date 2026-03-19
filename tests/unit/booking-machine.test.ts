import { describe, expect, test } from "bun:test";
import {
  canTransition,
  validateTransition,
  type BookingStatus,
} from "../../src/modules/booking/state-machine";
import { BookingTransitionError, ForbiddenError } from "../../src/shared/lib/errors";
import type { Booking } from "../../src/generated/database";

function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "test-booking-id",
    listing_id: "test-listing-id",
    renter_id: "renter-id",
    owner_id: "owner-id",
    start_time: "2024-01-01T10:00:00Z",
    end_time: "2024-01-02T10:00:00Z",
    status: "requested",
    payment_authorized: true,
    subtotal: 1000,
    service_fee: 120,
    delivery_fee: 0,
    protection_fee: 0,
    deposit_amount: 0,
    total_amount: 1120,
    owner_payout: 940,
    currency: "USD",
    delivery_method: null,
    delivery_address: null,
    protection_plan: "none",
    approved_at: null,
    declined_at: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    started_at: null,
    completed_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as Booking;
}

describe("Unit: Booking State Machine", () => {
  describe("canTransition", () => {
    test("should allow requested -> approved", () => {
      expect(canTransition("requested", "approved")).toBe(true);
    });

    test("should allow requested -> declined", () => {
      expect(canTransition("requested", "declined")).toBe(true);
    });

    test("should allow requested -> cancelled", () => {
      expect(canTransition("requested", "cancelled")).toBe(true);
    });

    test("should allow approved -> active", () => {
      expect(canTransition("approved", "active")).toBe(true);
    });

    test("should allow approved -> cancelled", () => {
      expect(canTransition("approved", "cancelled")).toBe(true);
    });

    test("should allow active -> completed", () => {
      expect(canTransition("active", "completed")).toBe(true);
    });

    test("should allow active -> cancelled", () => {
      expect(canTransition("active", "cancelled")).toBe(true);
    });

    test("should allow active -> disputed", () => {
      expect(canTransition("active", "disputed")).toBe(true);
    });

    test("should allow disputed -> resolved", () => {
      expect(canTransition("disputed", "resolved")).toBe(true);
    });

    test("should NOT allow requested -> completed (must go through approved/active)", () => {
      expect(canTransition("requested", "completed")).toBe(false);
    });

    test("should NOT allow completed -> anything (terminal state)", () => {
      const states: BookingStatus[] = ["requested", "approved", "active", "cancelled", "disputed", "resolved"];
      for (const state of states) {
        expect(canTransition("completed", state)).toBe(false);
      }
    });

    test("should NOT allow declined -> anything (terminal state)", () => {
      expect(canTransition("declined", "approved")).toBe(false);
    });

    test("should NOT allow cancelled -> anything (terminal state)", () => {
      expect(canTransition("cancelled", "approved")).toBe(false);
    });
  });

  describe("validateTransition - role based", () => {
    test("owner can approve booking", () => {
      const booking = createMockBooking({ status: "requested" });
      expect(() =>
        validateTransition("requested", "approved", "owner-id", booking)
      ).not.toThrow();
    });

    test("renter CANNOT approve booking", () => {
      const booking = createMockBooking({ status: "requested", renter_id: "renter-id", owner_id: "owner-id" });
      expect(() =>
        validateTransition("requested", "approved", "renter-id", booking)
      ).toThrow(ForbiddenError);
    });

    test("owner can decline booking", () => {
      const booking = createMockBooking({ status: "requested" });
      expect(() =>
        validateTransition("requested", "declined", "owner-id", booking)
      ).not.toThrow();
    });

    test("renter CANNOT decline booking", () => {
      const booking = createMockBooking({ status: "requested" });
      expect(() =>
        validateTransition("requested", "declined", "renter-id", booking)
      ).toThrow(ForbiddenError);
    });

    test("renter can cancel their booking", () => {
      const booking = createMockBooking({ status: "requested", renter_id: "renter-id" });
      expect(() =>
        validateTransition("requested", "cancelled", "renter-id", booking)
      ).not.toThrow();
    });

    test("owner can cancel booking they own", () => {
      const booking = createMockBooking({ status: "requested", owner_id: "owner-id" });
      expect(() =>
        validateTransition("requested", "cancelled", "owner-id", booking)
      ).not.toThrow();
    });

    test("third party CANNOT cancel booking", () => {
      const booking = createMockBooking({ status: "requested", owner_id: "owner-id", renter_id: "renter-id" });
      expect(() =>
        validateTransition("requested", "cancelled", "third-party-id", booking)
      ).toThrow(ForbiddenError);
    });

    test("system can transition active -> completed", () => {
      const booking = createMockBooking({ status: "active" });
      expect(() =>
        validateTransition("active", "completed", "system-id", booking)
      ).not.toThrow();
    });
  });

  describe("validateTransition - invalid transitions", () => {
    test("should throw BookingTransitionError for invalid transition", () => {
      const booking = createMockBooking({ status: "requested" });
      expect(() =>
        validateTransition("requested", "completed", "renter-id", booking)
      ).toThrow(BookingTransitionError);
    });

    test("error message should contain from and to states", () => {
      const booking = createMockBooking({ status: "requested" });
      try {
        validateTransition("requested", "completed", "renter-id", booking);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(BookingTransitionError);
        expect((error as BookingTransitionError).message).toContain("requested");
        expect((error as BookingTransitionError).message).toContain("completed");
      }
    });
  });
});