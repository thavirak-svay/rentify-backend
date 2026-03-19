import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '@/config/env';
import { TRANSACTION_STATUS } from '@/constants/payment';
import { dataResponse, successResponse } from '@/shared/lib/openapi';
import type { Variables } from '@/shared/types/context';
import * as mockService from './service';

const mock = new Hono<{ Bindings: Env; Variables: Variables }>();

const checkoutSchema = z.object({
  booking_id: z.string(),
  amount: z.number(),
  currency: z.string().default('USD'),
  listing_title: z.string(),
});

const actionSchema = z.object({
  transaction_id: z.string(),
  action: z.enum(['capture', 'cancel', 'refund']),
});

mock.post(
  '/checkout',
  describeRoute({
    tags: ['Mock'],
    summary: 'Create mock payment checkout (testing only)',
    responses: {
      200: dataResponse(
        z.object({
          checkout_url: z.string(),
          transaction_id: z.string(),
        }),
        'Checkout created',
      ),
    },
  }),
  validator('json', checkoutSchema),
  async (c) => {
    const env = c.env;
    const input = c.req.valid('json');

    const result = await mockService.createPreAuth(
      env,
      {
        id: input.booking_id,
        listingTitle: input.listing_title,
        renterFirstName: 'Test',
        renterLastName: 'User',
        renterEmail: 'test@example.com',
        renterPhone: '+85512345678',
        ownerId: '',
        ownerPaywayBeneficiaryId: '',
      },
      {
        total_renter_pays: input.amount,
        owner_payout: input.amount * 0.88,
      },
    );

    return c.json({
      data: {
        checkout_url: result.checkout_url,
        transaction_id: result.transaction_id,
      },
    });
  },
);

mock.post(
  '/action',
  describeRoute({
    tags: ['Mock'],
    summary: 'Execute mock payment action (testing only)',
    responses: {
      200: dataResponse(
        z.object({
          success: z.boolean(),
          transaction_id: z.string(),
          action: z.string(),
          status: z.string(),
        }),
        'Action executed',
      ),
    },
  }),
  validator('json', actionSchema),
  async (c) => {
    const env = c.env;
    const { transaction_id, action } = c.req.valid('json');

    if (action === 'capture') {
      await mockService.captureWithPayout(env, transaction_id);
    } else if (action === 'cancel') {
      await mockService.cancelPreAuth(env, transaction_id);
    } else if (action === 'refund') {
      await mockService.refundPayment(env, transaction_id);
    }

    const statusMap: Record<string, string> = {
      capture: TRANSACTION_STATUS.COMPLETED,
      cancel: TRANSACTION_STATUS.CANCELLED,
      refund: TRANSACTION_STATUS.REFUNDED,
    };

    return c.json({
      data: {
        success: true,
        transaction_id,
        action,
        status: statusMap[action] || 'unknown',
      },
    });
  },
);

mock.get(
  '/status/:transaction_id',
  describeRoute({
    tags: ['Mock'],
    summary: 'Get mock transaction status (testing only)',
    responses: {
      200: dataResponse(
        z.object({
          transaction_id: z.string(),
          status: z.string(),
          amount: z.number(),
          currency: z.string(),
        }),
        'Transaction status',
      ),
    },
  }),
  validator('param', z.object({ transaction_id: z.string() })),
  async (c) => {
    const env = c.env;
    const { transaction_id } = c.req.valid('param');

    const result = await mockService.checkTransaction(env, transaction_id);

    return c.json({
      data: {
        transaction_id,
        status: result.payment_status,
        amount: result.amount,
        currency: result.currency,
      },
    });
  },
);

mock.post(
  '/simulate-callback',
  describeRoute({
    tags: ['Mock'],
    summary: 'Simulate payment callback (testing only)',
    responses: {
      200: successResponse('Callback simulated'),
    },
  }),
  validator(
    'json',
    z.object({
      transaction_id: z.string(),
      status: z.enum(['APPROVED', 'DECLINED', 'PENDING', 'CANCELLED']),
    }),
  ),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { transaction_id, status } = c.req.valid('json');

    await mockService.simulateCallback(supabaseAdmin, transaction_id, status);

    return c.json({ success: true, data: { transaction_id, status } });
  },
);

export default mock;
