import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { z } from 'zod';
import type { Env } from '../../config/env';
import { dataResponse, jsonContent, successResponse } from '../../shared/lib/openapi';
import { optionalAuth } from '../../shared/middleware/auth';
import type { Variables } from '../../shared/types/context';
import * as paymentService from './service';

const payments = new Hono<{ Bindings: Env; Variables: Variables }>();

payments.use('*', optionalAuth);

const TRANSACTION_STATUS_SCHEMA = z.object({
  payment_status: z.string(),
  amount: z.number(),
  currency: z.string(),
});

const PAY_WAY_CALLBACK_SCHEMA = z.object({
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
  validator('json', PAY_WAY_CALLBACK_SCHEMA),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const PAYLOAD = c.req.valid('json');

    await paymentService.handlePaywayCallback(SUPABASE_ADMIN, ENV, PAYLOAD);
    return c.json({ success: true });
  },
);

payments.get(
  '/:id/status',
  describeRoute({
    tags: ['Payments'],
    summary: 'Get transaction status',
    responses: { 200: dataResponse(TRANSACTION_STATUS_SCHEMA, 'Transaction status') },
  }),
  validator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const { id } = c.req.valid('param');

    const DATA = await paymentService.getTransactionStatus(SUPABASE_ADMIN, ENV, id);
    return c.json({ data: DATA });
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
  validator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const ENV = c.get('env');
    const { id } = c.req.valid('param');

    const DATA = await paymentService.refundTransaction(SUPABASE_ADMIN, ENV, id);
    return c.json({ data: DATA });
  },
);

export default payments;
