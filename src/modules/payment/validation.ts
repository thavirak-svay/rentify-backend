import { z } from 'zod';

export const transactionStatusSchema = z.object({
  payment_status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export const payWayCallbackSchema = z.object({
  tran_id: z.string(),
  status: z.string(),
  hash: z.string(),
});

export type TransactionStatusInput = z.infer<typeof transactionStatusSchema>;
export type PayWayCallbackInput = z.infer<typeof payWayCallbackSchema>;