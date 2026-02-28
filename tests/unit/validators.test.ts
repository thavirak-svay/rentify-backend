import { describe, expect, test } from "bun:test";
import { createListingSchema, updateListingSchema, listingIdSchema } from "../../src/lib/validators";

describe("Validators", () => {
  describe("createListingSchema", () => {
    test("should validate valid listing input", () => {
      const validInput = {
        title: "Test Listing",
        description: "A test listing",
        type: "offer",
        price_daily: 10000,
      };

      const result = createListingSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    test("should reject title too short", () => {
      const invalidInput = {
        title: "Test",
        price_daily: 10000,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject title too long", () => {
      const invalidInput = {
        title: "a".repeat(201),
        price_daily: 10000,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject negative price", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: -1000,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject non-integer price", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000.5,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject invalid currency length", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        currency: "USDD",
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject invalid type", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        type: "invalid",
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject invalid country code length", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        address_country: "USA",
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject invalid latitude", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        location: {
          lat: 91,
          lng: 0,
        },
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject invalid longitude", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        location: {
          lat: 0,
          lng: 181,
        },
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should reject negative deposit amount", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        deposit_amount: -100,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    test("should apply default values", () => {
      const input = {
        title: "Test Listing",
        price_daily: 1000,
      };

      const result = createListingSchema.safeParse(input);
      if (result.success) {
        expect(result.data.type).toBe("offer");
        expect(result.data.deposit_amount).toBe(0);
        expect(result.data.currency).toBe("USD");
        expect(result.data.delivery_available).toBe(false);
        expect(result.data.pickup_available).toBe(true);
        expect(result.data.min_rental_hours).toBe(1);
      }
    });

    test("should accept optional hourly price", () => {
      const input = {
        title: "Test Listing",
        price_hourly: 1000,
        price_daily: 5000,
      };

      const result = createListingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("should accept optional weekly price", () => {
      const input = {
        title: "Test Listing",
        price_daily: 5000,
        price_weekly: 30000,
      };

      const result = createListingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("should reject negative delivery fee", () => {
      const invalidInput = {
        title: "Test Listing",
        price_daily: 1000,
        delivery_fee: -100,
      };

      const result = createListingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("updateListingSchema", () => {
    test("should allow partial updates", () => {
      const input = {
        title: "Updated Title",
      };

      const result = updateListingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("should allow empty object", () => {
      const input = {};

      const result = updateListingSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("listingIdSchema", () => {
    test("should validate valid UUID", () => {
      const input = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = listingIdSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("should reject invalid UUID", () => {
      const input = {
        id: "not-a-uuid",
      };

      const result = listingIdSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
