import { describe, expect, test } from "bun:test";
import { calculatePricing } from "../../src/modules/pricing";
import { ValidationError } from "../../src/shared/lib/errors";

describe("Unit: Pricing Engine", () => {
  describe("calculatePricing", () => {
    test("should calculate correct pricing for 1-day rental", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(1000);
      expect(result.service_fee).toBe(120);
      expect(result.total_renter_pays).toBe(1120);
      expect(result.owner_payout).toBe(940);
      expect(result.rental_days).toBe(1);
    });

    test("should calculate correct pricing for 3-day rental", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-04T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(3000);
      expect(result.service_fee).toBe(360);
      expect(result.total_renter_pays).toBe(3360);
      expect(result.rental_days).toBe(3);
    });

    test("should use hourly rate for rentals under 8 hours", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T15:00:00Z"),
        priceHourly: 200,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(1000); // 5 hours * $2
      expect(result.rental_hours).toBe(5);
    });

    test("should use daily rate for rentals 8+ hours", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T20:00:00Z"),
        priceHourly: 200,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(1000); // Uses daily rate
      expect(result.rental_days).toBe(1);
    });

    test("should use weekly rate for 7 days", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-08T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: 6000,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(6000);
      expect(result.rental_days).toBe(7);
    });

    test("should add delivery fee when selected", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "delivery",
        deliveryFee: 500,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.delivery_fee).toBe(500);
      expect(result.total_renter_pays).toBe(1620); // 1000 + 120 + 500
    });

    test("should add basic protection fee (5%)", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "basic",
        serviceFeeRate: 0.12,
      });

      expect(result.protection_fee).toBe(50);
      expect(result.total_renter_pays).toBe(1170);
    });

    test("should add premium protection fee (10%)", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "premium",
        serviceFeeRate: 0.12,
      });

      expect(result.protection_fee).toBe(100);
      expect(result.total_renter_pays).toBe(1220);
    });

    test("should include deposit in total", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 5000,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.deposit_amount).toBe(5000);
      expect(result.total_renter_pays).toBe(6120);
    });

    test("should calculate owner payout with 6% commission", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 10000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.owner_payout).toBe(9400); // 10000 - 6%
    });

    test("should calculate complex pricing with all fees", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-08T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: 6000,
        depositAmount: 5000,
        deliveryMethod: "delivery",
        deliveryFee: 500,
        protectionPlan: "premium",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(6000);
      expect(result.service_fee).toBe(720);
      expect(result.delivery_fee).toBe(500);
      expect(result.protection_fee).toBe(600);
      expect(result.deposit_amount).toBe(5000);
      expect(result.total_renter_pays).toBe(12820);
    });
  });

  describe("calculatePricing - Validation", () => {
    test("should throw ValidationError when endTime is before startTime", () => {
      expect(() =>
        calculatePricing({
          startTime: new Date("2024-01-10T10:00:00Z"),
          endTime: new Date("2024-01-05T10:00:00Z"),
          priceHourly: null,
          priceDaily: 1000,
          priceWeekly: null,
          depositAmount: 0,
          deliveryMethod: "pickup",
          deliveryFee: 0,
          protectionPlan: "none",
          serviceFeeRate: 0.12,
        })
      ).toThrow(ValidationError);
    });

    test("should throw ValidationError when rental period exceeds 90 days", () => {
      expect(() =>
        calculatePricing({
          startTime: new Date("2024-01-01T10:00:00Z"),
          endTime: new Date("2024-05-01T10:00:00Z"), // ~120 days
          priceHourly: null,
          priceDaily: 1000,
          priceWeekly: null,
          depositAmount: 0,
          deliveryMethod: "pickup",
          deliveryFee: 0,
          protectionPlan: "none",
          serviceFeeRate: 0.12,
        })
      ).toThrow(ValidationError);
    });

    test("should accept rental period under 90 days", () => {
      // 85 days should work
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-03-26T10:00:00Z"), // ~85 days
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.rental_days).toBeLessThan(90);
    });
  });

  describe("calculatePricing - Edge Cases", () => {
    test("should use weekly rate when cheaper for 5 days", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-06T10:00:00Z"), // 5 days
        priceHourly: null,
        priceDaily: 1500,
        priceWeekly: 6000, // Weekly is cheaper (6000 vs 5*1500=7500)
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(6000); // Uses weekly rate
    });

    test("should use daily rate when cheaper for 5 days", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-06T10:00:00Z"), // 5 days
        priceHourly: null,
        priceDaily: 1000, // Daily is cheaper (5*1000=5000 vs 7000)
        priceWeekly: 7000,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(5000); // Uses daily rate
    });

    test("should use daily rate for short rental when no hourly price", () => {
      const result = calculatePricing({
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T15:00:00Z"), // 5 hours
        priceHourly: null, // No hourly rate
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      });

      expect(result.subtotal).toBe(1000); // Falls back to daily rate
    });
  });
});