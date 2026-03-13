import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "zod";
import type { Env } from "../config/env";
import { ForbiddenError, NotFoundError, ValidationError } from "../lib/errors";
import { dataResponse, jsonContent, successResponse } from "../lib/openapi-helpers";
import { log } from "../middleware/logger";
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
      throw new ForbiddenError("Invalid payment callback hash");
    }

    const { tran_id, status } = payload;

    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id, booking_id, status")
      .eq("payway_tran_id", tran_id)
      .single();

    if (!existingTx) {
      log.warn({ tran_id, status }, "PayWay callback for unknown transaction");
      return c.json({ success: true });
    }

    if (existingTx.status !== "pending") {
      log.info(
        { tran_id, status, current_status: existingTx.status },
        "PayWay callback skipped - already processed"
      );
      return c.json({ success: true });
    }

    log.info({ tran_id, status, booking_id: existingTx.booking_id }, "Processing PayWay callback");

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
        .eq("id", existingTx.booking_id);
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
      throw new NotFoundError("Transaction not found");
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
      throw new NotFoundError("Transaction not found");
    }

    if (transaction.status !== "completed") {
      throw new ValidationError("Transaction cannot be refunded");
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
