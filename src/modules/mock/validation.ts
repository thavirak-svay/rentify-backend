import { z } from 'zod';
import { DEFAULT_CURRENCY } from '@/constants/payment';
import { MERCHANT_ACTION, type MerchantAction } from '@/constants/payment';

export const CALLBACK_STATUS = {
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
} as const;

export type CallbackStatus = (typeof CALLBACK_STATUS)[keyof typeof CALLBACK_STATUS];

export const checkoutSchema = z.object({
  booking_id: z.string(),
  amount: z.number(),
  currency: z.string().default(DEFAULT_CURRENCY),
  listing_title: z.string(),
});

export const actionSchema = z.object({
  transaction_id: z.string(),
  action: z.enum(Object.values(MERCHANT_ACTION) as [MerchantAction, ...MerchantAction[]]),
});

export const simulateCallbackSchema = z.object({
  transaction_id: z.string(),
  status: z.enum(Object.values(CALLBACK_STATUS) as [CallbackStatus, ...CallbackStatus[]]),
});

export const transactionIdParamSchema = z.object({
  transaction_id: z.string(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ActionInput = z.infer<typeof actionSchema>;
export type SimulateCallbackInput = z.infer<typeof simulateCallbackSchema>;