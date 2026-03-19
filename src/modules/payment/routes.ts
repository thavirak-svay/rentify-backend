import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { z } from 'zod';
import type { Env } from '@/config/env';
import { dataResponse, jsonContent, successResponse } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as paymentService from './service';

const payments = new Hono<{ Bindings: Env; Variables: Variables }>();

payments.use('*', optionalAuth);

const transactionStatusSchema = z.object({
  payment_status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

const payWayCallbackSchema = z.object({
  tran_id: z.string(),
  status: z.string(),
  hash: z.string(),
});

payments.post(
  '/payway-callback',
  describeRoute({
    tags: ['Payments'],
    summary: 'PayWay payment callback',
    responses: { 200: successResponse('Callback processed') },
  }),
  validator('json', payWayCallbackSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const env = c.get('env');
    const payload = c.req.valid('json');

    await paymentService.handlePaywayCallback(supabaseAdmin, env, payload);
    return c.json({ success: true });
  },
);

payments.get(
  '/:id/status',
  describeRoute({
    tags: ['Payments'],
    summary: 'Get transaction status',
    responses: { 200: dataResponse(transactionStatusSchema, 'Transaction status') },
  }),
  validator('param', z.object({ id: z.uuid() })),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const env = c.get('env');
    const { id } = c.req.valid('param');

    const data = await paymentService.getTransactionStatus(supabaseAdmin, env, id);
    return c.json({ data: data });
  },
);

payments.post(
  '/:id/refund',
  describeRoute({
    tags: ['Payments'],
    summary: 'Refund a transaction',
    responses: {
      200: jsonContent(z.object({ data: z.object({ success: z.boolean() }) }), 'Refund processed'),
    },
  }),
  validator('param', z.object({ id: z.uuid() })),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const env = c.get('env');
    const { id } = c.req.valid('param');

    const data = await paymentService.refundTransaction(supabaseAdmin, env, id);
    return c.json({ data: data });
  },
);

export default payments;
