import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { dataResponse, jsonContent, successResponse, uuidParam } from '@/shared/lib/openapi';
import { optionalAuth } from '@/shared/middleware/auth';
import type { Variables } from '@/shared/types/context';
import * as paymentService from './service';
import { payWayCallbackSchema, transactionStatusSchema } from './validation';

const payments = new Hono<{ Bindings: Env; Variables: Variables }>();

payments.use('*', optionalAuth);

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
  validator('param', uuidParam),
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
  validator('param', uuidParam),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const env = c.get('env');
    const { id } = c.req.valid('param');

    const data = await paymentService.refundTransaction(supabaseAdmin, env, id);
    return c.json({ data: data });
  },
);

export default payments;
