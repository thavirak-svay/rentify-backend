import { Hono } from "hono";
import type { Env } from "../config/env";
import * as paymentService from "../services/payment.service";

const payments = new Hono<{ Bindings: Env }>();

payments.post("/payway-callback", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const payload = await c.req.json();

  if (!paymentService.verifyCallbackHash(env, payload)) {
    return c.json({ error: "Invalid hash" }, 400);
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
});

payments.get("/:id/status", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const transactionId = c.req.param("id");

  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .select("payway_tran_id")
    .eq("id", transactionId)
    .single();

  if (error || !transaction?.payway_tran_id) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  const status = await paymentService.checkTransaction(env, transaction.payway_tran_id);

  return c.json({ data: status });
});

payments.post("/:id/refund", async (c) => {
  const supabaseAdmin = c.get("supabaseAdmin");
  const env = c.get("env");
  const transactionId = c.req.param("id");

  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .select("payway_tran_id, status")
    .eq("id", transactionId)
    .single();

  if (error || !transaction) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  if (transaction.status !== "completed") {
    return c.json({ error: "Transaction cannot be refunded" }, 400);
  }

  const result = await paymentService.refundPayment(env, transaction.payway_tran_id);

  if (result.success) {
    await supabaseAdmin
      .from("transactions")
      .update({ status: "refunded", processed_at: new Date().toISOString() })
      .eq("id", transactionId);
  }

  return c.json({ data: result });
});

export default payments;
