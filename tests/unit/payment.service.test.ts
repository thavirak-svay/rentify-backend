import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../../src/config/env";
import * as paymentService from "../../src/services/payment.service";
import { createHash } from "node:crypto";

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
};

function generateHash(apiKey: string, data: string): string {
  return createHash("sha512")
    .update(data + apiKey)
    .digest("base64");
}

describe("Payment Service", () => {
  describe("Hash generation", () => {
    test("should generate consistent hash", () => {
      const hash1 = generateHash("apiKey", "testData");
      const hash2 = generateHash("apiKey", "testData");
      expect(hash1).toBe(hash2);
    });

    test("should generate different hashes for different data", () => {
      const hash1 = generateHash("apiKey", "data1");
      const hash2 = generateHash("apiKey", "data2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("createPreAuth", () => {
    test("should throw error when PayWay API returns non-ok response", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      const booking: paymentService.PayWayBooking = {
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

      await expect(paymentService.createPreAuth(mockEnv, booking, pricing)).rejects.toThrow(
        "PayWay pre-auth failed: 500 - Internal Server Error"
      );
    });
  });

  describe("captureWithPayout", () => {
    test("should throw error when capture fails with non-00 status code", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: { code: "01", message: "Capture failed" },
              grand_total: 0,
              transaction_status: "failed",
            }),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      await expect(paymentService.captureWithPayout(mockEnv, "test-tran-id")).rejects.toThrow(
        "PayWay capture failed: Capture failed"
      );
    });

    test("should throw error when PayWay API returns non-ok response", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      await expect(paymentService.captureWithPayout(mockEnv, "test-tran-id")).rejects.toThrow(
        "PayWay capture failed: 500 - Server Error"
      );
    });
  });

  describe("cancelPreAuth", () => {
    test("should throw error when PayWay API returns non-ok response", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      await expect(paymentService.cancelPreAuth(mockEnv, "test-tran-id")).rejects.toThrow(
        "PayWay cancel failed: 500 - Server Error"
      );
    });
  });

  describe("refundPayment", () => {
    test("should throw error when PayWay API returns non-ok response", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      await expect(paymentService.refundPayment(mockEnv, "test-tran-id")).rejects.toThrow(
        "PayWay refund failed: 500 - Server Error"
      );
    });
  });

  describe("checkTransaction", () => {
    test("should throw error when PayWay API returns non-ok response", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          statusText: "Internal Server Error",
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      await expect(paymentService.checkTransaction(mockEnv, "test-tran-id")).rejects.toThrow(
        "PayWay check transaction failed: Internal Server Error"
      );
    });

    test("should return transaction status when successful", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                payment_status: "success",
                amount: 10000,
                currency: "USD",
              },
            }),
        } as unknown as Response)
      );

      globalThis.fetch = mockFetch;

      const result = await paymentService.checkTransaction(mockEnv, "test-tran-id");
      expect(result.payment_status).toBe("success");
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe("USD");
    });
  });

  describe("verifyCallbackHash", () => {
    test("should return true for valid hash", () => {
      const payload = {
        tran_id: "test-tran-id",
        amount: "10000",
        status: "success",
      };

      const dataString = Object.keys(payload)
        .sort()
        .map((key) => String(payload[key as keyof typeof payload]))
        .join("");

      const validHash = generateHash(mockEnv.PAYWAY_API_KEY, dataString);

      const payloadWithHash = {
        ...payload,
        hash: validHash,
      };

      const result = paymentService.verifyCallbackHash(mockEnv, payloadWithHash);
      expect(result).toBe(true);
    });

    test("should return false for invalid hash", () => {
      const payload = {
        tran_id: "test-tran-id",
        amount: "10000",
        status: "success",
        hash: "invalid-hash",
      };

      const result = paymentService.verifyCallbackHash(mockEnv, payload);
      expect(result).toBe(false);
    });
  });
});
