import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { dataResponse, successResponse } from "../lib/openapi-helpers";
import * as mockPayment from "../services/mock-payment.service";
import type { Variables } from "../types/variables";

const payments = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================
// Mock Payment Routes - For testing only
// Remove this file when going to production
// ============================================

const CheckoutSchema = z.object({
  booking_id: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  listing_title: z.string(),
});

const ActionSchema = z.object({
  transaction_id: z.string(),
  action: z.enum(["capture", "cancel", "refund"]),
});

// POST /checkout - Create mock payment checkout
payments.post(
  "/checkout",
  describeRoute({
    tags: ["Mock Payments"],
    summary: "Create mock payment checkout (testing only)",
    responses: {
      200: dataResponse(
        z.object({
          checkout_url: z.string(),
          transaction_id: z.string(),
        }),
        "Checkout created"
      ),
    },
  }),
  validator("json", CheckoutSchema),
  async (c) => {
    const input = c.req.valid("json");
    const result = await mockPayment.createPreAuth(
      c.env,
      {
        id: input.booking_id,
        listingTitle: input.listing_title,
        renterFirstName: "Test",
        renterLastName: "User",
        renterEmail: "test@example.com",
        renterPhone: "+85512345678",
        ownerId: "",
        ownerPaywayBeneficiaryId: "",
      },
      {
        total_renter_pays: input.amount,
        owner_payout: input.amount * 0.88,
      }
    );

    return c.json({
      data: {
        checkout_url: result.checkout_url,
        transaction_id: result.transaction_id,
      },
    });
  }
);

// POST /action - Execute mock payment action
payments.post(
  "/action",
  describeRoute({
    tags: ["Mock Payments"],
    summary: "Execute mock payment action (testing only)",
    responses: {
      200: dataResponse(
        z.object({
          success: z.boolean(),
          transaction_id: z.string(),
          action: z.string(),
          status: z.string(),
        }),
        "Action executed"
      ),
    },
  }),
  validator("json", ActionSchema),
  async (c) => {
    const { transaction_id, action } = c.req.valid("json");

    const statusMap: Record<string, string> = {
      capture: "captured",
      cancel: "cancelled",
      refund: "refunded",
    };

    if (action === "capture") {
      await mockPayment.captureWithPayout(c.env, transaction_id);
    } else if (action === "cancel") {
      await mockPayment.cancelPreAuth(c.env, transaction_id);
    } else if (action === "refund") {
      await mockPayment.refundPayment(c.env, transaction_id);
    }

    return c.json({
      data: {
        success: true,
        transaction_id,
        action,
        status: statusMap[action] || "unknown",
      },
    });
  }
);

// GET /status/:transaction_id - Get mock transaction status
payments.get(
  "/status/:transaction_id",
  describeRoute({
    tags: ["Mock Payments"],
    summary: "Get mock transaction status (testing only)",
    responses: {
      200: dataResponse(
        z.object({
          transaction_id: z.string(),
          status: z.string(),
          amount: z.number(),
          currency: z.string(),
        }),
        "Transaction status"
      ),
    },
  }),
  validator("param", z.object({ transaction_id: z.string() })),
  async (c) => {
    const { transaction_id } = c.req.valid("param");
    const result = await mockPayment.checkTransaction(c.env, transaction_id);

    return c.json({
      data: {
        transaction_id,
        status: result.payment_status,
        amount: result.amount,
        currency: result.currency,
      },
    });
  }
);

// POST /simulate-callback - Simulate payment callback
payments.post(
  "/simulate-callback",
  describeRoute({
    tags: ["Mock Payments"],
    summary: "Simulate payment callback (testing only)",
    responses: {
      200: successResponse("Callback simulated"),
    },
  }),
  validator(
    "json",
    z.object({
      transaction_id: z.string(),
      status: z.enum(["APPROVED", "DECLINED", "PENDING", "CANCELLED"]),
    })
  ),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const { transaction_id, status } = c.req.valid("json");

    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("booking_id")
      .eq("payway_tran_id", transaction_id)
      .single();

    if (transaction) {
      await supabaseAdmin
        .from("transactions")
        .update({
          status: status === "APPROVED" ? "authorized" : "failed",
        })
        .eq("payway_tran_id", transaction_id);

      if (status === "APPROVED") {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_authorized: true })
          .eq("id", transaction.booking_id);
      }
    }

    return c.json({ success: true, data: { transaction_id, status } });
  }
);

export default payments;
