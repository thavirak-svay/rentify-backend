import { describe, test, expect } from "bun:test";
import { calculatePricing, type PricingInput } from "../../src/lib/pricing";

describe("Pricing Engine", () => {
  describe("Basic daily pricing", () => {
    test("should calculate daily rate for 1 day rental", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000, // $10.00 in cents
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(1000);
      expect(result.service_fee).toBe(120);
      expect(result.delivery_fee).toBe(0);
      expect(result.protection_fee).toBe(0);
      expect(result.total_renter_pays).toBe(1120);
      expect(result.owner_payout).toBe(940); // 1000 - 6% commission
      expect(result.rental_days).toBe(1);
    });

    test("should calculate daily rate for 3 days rental", () => {
      const input: PricingInput = {
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
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(3000);
      expect(result.service_fee).toBe(360);
      expect(result.total_renter_pays).toBe(3360);
      expect(result.rental_days).toBe(3);
    });
  });

  describe("Hourly pricing", () => {
    test("should use hourly rate for rentals under 8 hours", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T15:00:00Z"), // 5 hours
        priceHourly: 200, // $2.00 per hour
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(1000); // 5 hours * $2
      expect(result.rental_hours).toBe(5);
    });

    test("should use daily rate for rentals 8+ hours even if hourly available", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T20:00:00Z"), // 10 hours
        priceHourly: 200,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(1000); // Uses daily rate
      expect(result.rental_days).toBe(1);
    });
  });

  describe("Weekly pricing", () => {
    test("should use weekly rate for 7 days", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-08T10:00:00Z"), // 7 days
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: 6000, // $60 for week
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(6000); // Uses weekly rate
      expect(result.rental_days).toBe(7);
    });

    test("should use weekly rate for 5+ days if cheaper", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-06T10:00:00Z"), // 5 days
        priceHourly: null,
        priceDaily: 1500, // $15/day = $75 for 5 days
        priceWeekly: 6000, // $60/week
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(6000); // Weekly is cheaper
    });

    test("should use daily rate if weekly is more expensive", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-06T10:00:00Z"), // 5 days
        priceHourly: null,
        priceDaily: 1000, // $10/day = $50 for 5 days
        priceWeekly: 8000, // $80/week
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(5000); // Daily is cheaper
    });

    test("should mix weekly and daily for 10 days", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-11T10:00:00Z"), // 10 days
        priceHourly: null,
        priceDaily: 1000, // $10/day
        priceWeekly: 6000, // $60/week
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      // 1 week + 3 days = 6000 + 3000 = 9000
      // vs 10 days = 10000
      expect(result.subtotal).toBe(9000);
      expect(result.rental_days).toBe(10);
    });
  });

  describe("Delivery fees", () => {
    test("should add delivery fee when delivery selected", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "delivery",
        deliveryFee: 500, // $5 delivery
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.delivery_fee).toBe(500);
      expect(result.total_renter_pays).toBe(1620); // 1000 + 120 + 500
    });

    test("should not add delivery fee for pickup", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 500,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.delivery_fee).toBe(0);
    });
  });

  describe("Protection plans", () => {
    test("should add basic protection fee (5%)", () => {
      const input: PricingInput = {
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
      };

      const result = calculatePricing(input);

      expect(result.protection_fee).toBe(50); // 5% of 1000
      expect(result.total_renter_pays).toBe(1170); // 1000 + 120 + 50
    });

    test("should add premium protection fee (10%)", () => {
      const input: PricingInput = {
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
      };

      const result = calculatePricing(input);

      expect(result.protection_fee).toBe(100); // 10% of 1000
      expect(result.total_renter_pays).toBe(1220); // 1000 + 120 + 100
    });
  });

  describe("Deposits", () => {
    test("should include deposit in total but not affect subtotal", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: null,
        depositAmount: 5000, // $50 deposit
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(1000);
      expect(result.deposit_amount).toBe(5000);
      expect(result.total_renter_pays).toBe(6120); // 1000 + 120 + 5000
    });
  });

  describe("Owner payout", () => {
    test("should calculate owner payout with 6% commission", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-02T10:00:00Z"),
        priceHourly: null,
        priceDaily: 10000, // $100
        priceWeekly: null,
        depositAmount: 0,
        deliveryMethod: "pickup",
        deliveryFee: 0,
        protectionPlan: "none",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.owner_payout).toBe(9400); // 10000 - 6%
    });
  });

  describe("Complex scenarios", () => {
    test("should calculate complete pricing with all fees", () => {
      const input: PricingInput = {
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-08T10:00:00Z"), // 7 days
        priceHourly: null,
        priceDaily: 1000,
        priceWeekly: 6000,
        depositAmount: 5000,
        deliveryMethod: "delivery",
        deliveryFee: 500,
        protectionPlan: "premium",
        serviceFeeRate: 0.12,
      };

      const result = calculatePricing(input);

      expect(result.subtotal).toBe(6000);
      expect(result.service_fee).toBe(720); // 12% of 6000
      expect(result.delivery_fee).toBe(500);
      expect(result.protection_fee).toBe(600); // 10% of 6000
      expect(result.deposit_amount).toBe(5000);
      expect(result.total_renter_pays).toBe(12820); // 6000 + 720 + 500 + 600 + 5000
      expect(result.owner_payout).toBe(5640); // 6000 - 6%
    });
  });
});
