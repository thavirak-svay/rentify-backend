import { describe, expect, test } from "bun:test";
import { MockPaymentClient } from "../../src/client/mock";
import type { Env } from "../../src/config/env";

const mockEnv: Env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SECRET_KEY: "test-secret-key",
  PAYWAY_MERCHANT_ID: "test-merchant-id",
  PAYWAY_API_KEY: "test-api-key",
  PAYWAY_MERCHANT_AUTH: "test-merchant-auth",
  PAYWAY_BASE_URL: "https://test.payway.com.kh",
  PAYWAY_CALLBACK_URL: "https://test.workers.dev",
  APP_URL: "https://test.app.com",
  NODE_ENV: "test",
};

const client = new MockPaymentClient(mockEnv);

describe("Mock Payment Client", () => {
  describe("createPreAuth", () => {
    test("should create mock pre-auth transaction", async () => {
      const booking = {
        id: "test-booking-id",
        listingTitle: "Test Listing",
        renterFirstName: "John",
        renterLastName: "Doe",
        renterEmail: "test@example.com",
        renterPhone: "+85512345678",
        ownerId: "owner-id",
        ownerPaywayBeneficiaryId: "",
      };

      const pricing = {
        total_renter_pays: 10000,
        owner_payout: 9400,
      };

      const result = await client.createPreAuth(booking, pricing);

      expect(result.transaction_id).toContain("MOCK");
      expect(result.payway_tran_id).toContain("MOCK");
      expect(result.checkout_url).toContain("tran_id=");
      expect(result.checkout_url).toContain("status=pending");
    });

    test("should generate unique transaction IDs", async () => {
      const booking = {
        id: "test-booking-id",
        listingTitle: "Test Listing",
        renterFirstName: "John",
        renterLastName: "Doe",
        renterEmail: "test@example.com",
        renterPhone: "+85512345678",
        ownerId: "owner-id",
        ownerPaywayBeneficiaryId: "",
      };

      const pricing = {
        total_renter_pays: 10000,
        owner_payout: 9400,
      };

      const result1 = await client.createPreAuth(booking, pricing);
      const result2 = await client.createPreAuth(booking, pricing);

      expect(result1.transaction_id).not.toBe(result2.transaction_id);
    });
  });

  describe("capture", () => {
    test("should return success response", async () => {
      const result = await client.capture("test-tran-id");

      expect(result.success).toBe(true);
      expect(result.grand_total).toBe(0);
      expect(result.transaction_status).toBe("completed");
    });
  });

  describe("cancelPreAuth", () => {
    test("should return success response", async () => {
      const result = await client.cancelPreAuth("test-tran-id");

      expect(result.success).toBe(true);
      expect(result.transaction_status).toBe("cancelled");
    });
  });

  describe("refund", () => {
    test("should return success response", async () => {
      const result = await client.refund("test-tran-id");

      expect(result.success).toBe(true);
      expect(result.total_refunded).toBe(0);
      expect(result.transaction_status).toBe("refunded");
    });
  });

  describe("checkTransaction", () => {
    test("should return pending status", async () => {
      const result = await client.checkTransaction("test-tran-id");

      expect(result.payment_status).toBe("pending");
      expect(result.amount).toBe(0);
      expect(result.currency).toBe("USD");
    });
  });
});
