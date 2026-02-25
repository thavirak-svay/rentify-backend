import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { dataResponse, jsonContent, successResponse } from "../lib/openapi-helpers";
import { optionalAuth } from "../middleware/optional-auth";
import * as paymentService from "../services/payment.service";
import type { Variables } from "../types/variables";

const payments = new Hono<{ Bindings: Env; Variables: Variables }>();

payments.use("*", optionalAuth);

const TransactionStatusSchema = z.object({
  payment_status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

const PayWayCallbackSchema = z.object({
  tran_id: z.string(),
  status: z.string(),
  hash: z.string(),
});

payments.post(
  "/payway-callback",
  describeRoute({
    tags: ["Payments"],
    summary: "PayWay payment callback",
    responses: { 200: successResponse("Callback processed") },
  }),
  validator("json", PayWayCallbackSchema),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const payload = c.req.valid("json");

    if (!paymentService.verifyCallbackHash(env, payload)) {
      throw new Error("Invalid hash");
    }

    const { tran_id, status } = payload;

    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("booking_id")
      .eq("payway_tran_id", tran_id)
      .single();

    if (transaction) {
      await supabaseAdmin
        .from("transactions")
        .update({
          status: status === "APPROVED" ? "authorized" : "failed",
          metadata: { payway_callback: payload },
        })
        .eq("payway_tran_id", tran_id);

      if (status === "APPROVED") {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_authorized: true })
          .eq("id", transaction.booking_id);
      }
    }

    return c.json({ success: true });
  }
);

payments.get(
  "/:id/status",
  describeRoute({
    tags: ["Payments"],
    summary: "Get transaction status",
    responses: { 200: dataResponse(TransactionStatusSchema, "Transaction status") },
  }),
  validator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const { id } = c.req.valid("param");

    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("payway_tran_id")
      .eq("id", id)
      .single();

    if (error || !transaction?.payway_tran_id) {
      throw new Error("Transaction not found");
    }

    const data = await paymentService.checkTransaction(env, transaction.payway_tran_id);
    return c.json({ data });
  }
);

payments.post(
  "/:id/refund",
  describeRoute({
    tags: ["Payments"],
    summary: "Refund a transaction",
    responses: {
      200: jsonContent(z.object({ data: z.object({ success: z.boolean() }) }), "Refund processed"),
    },
  }),
  validator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const supabaseAdmin = c.get("supabaseAdmin");
    const env = c.get("env");
    const { id } = c.req.valid("param");

    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("payway_tran_id, status")
      .eq("id", id)
      .single();

    if (error || !transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "completed") {
      throw new Error("Transaction cannot be refunded");
    }

    const result = await paymentService.refundPayment(env, transaction.payway_tran_id);

    if (result.success) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "refunded", processed_at: new Date().toISOString() })
        .eq("id", id);
    }

    return c.json({ data: result });
  }
);

export default payments;
