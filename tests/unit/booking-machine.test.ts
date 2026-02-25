import { describe, expect, test } from "bun:test";
import {
  type BookingStatus,
  canTransition,
  validateTransition,
} from "../../src/lib/booking-machine";
import { BookingTransitionError, ForbiddenError } from "../../src/lib/errors";
import type { Booking } from "../../src/types/database";

describe("Booking State Machine", () => {
  const mockBooking = (overrides: Partial<Booking> = {}): Booking =>
    ({
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
    }) as Booking;

  describe("Valid transitions", () => {
    test("requested → approved", () => {
      expect(canTransition("requested", "approved")).toBe(true);
    });

    test("requested → declined", () => {
      expect(canTransition("requested", "declined")).toBe(true);
    });

    test("requested → auto_declined", () => {
      expect(canTransition("requested", "auto_declined")).toBe(true);
    });

    test("requested → cancelled", () => {
      expect(canTransition("requested", "cancelled")).toBe(true);
    });

    test("approved → active", () => {
      expect(canTransition("approved", "active")).toBe(true);
    });

    test("approved → cancelled", () => {
      expect(canTransition("approved", "cancelled")).toBe(true);
    });

    test("active → completed", () => {
      expect(canTransition("active", "completed")).toBe(true);
    });

    test("active → disputed", () => {
      expect(canTransition("active", "disputed")).toBe(true);
    });

    test("active → cancelled", () => {
      expect(canTransition("active", "cancelled")).toBe(true);
    });

    test("disputed → resolved", () => {
      expect(canTransition("disputed", "resolved")).toBe(true);
    });
  });

  describe("Invalid transitions", () => {
    test("requested → completed (invalid)", () => {
      expect(canTransition("requested", "completed")).toBe(false);
    });

    test("requested → active (invalid)", () => {
      expect(canTransition("requested", "active")).toBe(false);
    });

    test("declined → approved (invalid)", () => {
      expect(canTransition("declined", "approved")).toBe(false);
    });

    test("completed → cancelled (invalid)", () => {
      expect(canTransition("completed", "cancelled")).toBe(false);
    });

    test("resolved → disputed (invalid)", () => {
      expect(canTransition("resolved", "disputed")).toBe(false);
    });

    test("completed → anything (invalid)", () => {
      const statuses: BookingStatus[] = [
        "requested",
        "approved",
        "active",
        "cancelled",
        "disputed",
        "resolved",
      ];
      statuses.forEach((status) => {
        expect(canTransition("completed", status)).toBe(false);
      });
    });
  });

  describe("Role-based validation", () => {
    test("owner can approve booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "approved", "owner-id", booking)).not.toThrow();
    });

    test("renter cannot approve booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "approved", "renter-id", booking)).toThrow(
        ForbiddenError
      );
    });

    test("owner can decline booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "declined", "owner-id", booking)).not.toThrow();
    });

    test("renter cannot decline booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "declined", "renter-id", booking)).toThrow(
        ForbiddenError
      );
    });

    test("renter can cancel requested booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() =>
        validateTransition("requested", "cancelled", "renter-id", booking)
      ).not.toThrow();
    });

    test("owner can cancel requested booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "cancelled", "owner-id", booking)).not.toThrow();
    });

    test("third party cannot cancel booking", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "cancelled", "third-party-id", booking)).toThrow(
        ForbiddenError
      );
    });

    test("anyone can transition from active to completed (system)", () => {
      const booking = mockBooking({ status: "active" });

      expect(() => validateTransition("active", "completed", "system-id", booking)).not.toThrow();
    });
  });

  describe("Invalid state transitions", () => {
    test("should throw BookingTransitionError for invalid transition", () => {
      const booking = mockBooking({ status: "requested" });

      expect(() => validateTransition("requested", "completed", "renter-id", booking)).toThrow(
        BookingTransitionError
      );
    });

    test("error message should include from and to states", () => {
      const booking = mockBooking({ status: "requested" });

      try {
        validateTransition("requested", "completed", "renter-id", booking);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(BookingTransitionError);
        expect((error as BookingTransitionError).message).toContain("requested");
        expect((error as BookingTransitionError).message).toContain("completed");
      }
    });
  });

  describe("Terminal states", () => {
    test("declined is terminal - no transitions allowed", () => {
      const statuses: BookingStatus[] = [
        "requested",
        "approved",
        "active",
        "completed",
        "cancelled",
        "disputed",
        "resolved",
      ];
      statuses.forEach((status) => {
        expect(canTransition("declined", status)).toBe(false);
      });
    });

    test("auto_declined is terminal - no transitions allowed", () => {
      const statuses: BookingStatus[] = [
        "requested",
        "approved",
        "active",
        "completed",
        "cancelled",
        "disputed",
        "resolved",
      ];
      statuses.forEach((status) => {
        expect(canTransition("auto_declined", status)).toBe(false);
      });
    });

    test("completed is terminal - no transitions allowed", () => {
      const statuses: BookingStatus[] = [
        "requested",
        "approved",
        "active",
        "cancelled",
        "disputed",
        "resolved",
      ];
      statuses.forEach((status) => {
        expect(canTransition("completed", status)).toBe(false);
      });
    });

    test("resolved is terminal - no transitions allowed", () => {
      const statuses: BookingStatus[] = [
        "requested",
        "approved",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ];
      statuses.forEach((status) => {
        expect(canTransition("resolved", status)).toBe(false);
      });
    });
  });

  describe("Edge cases", () => {
    test("cancelled booking can be transitioned from multiple states", () => {
      const statesThatCanCancel: BookingStatus[] = ["requested", "approved", "active"];
      statesThatCanCancel.forEach((status) => {
        expect(canTransition(status, "cancelled")).toBe(true);
      });
    });
  });
});
