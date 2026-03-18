import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { dataResponse, successResponse } from '../../shared/lib/openapi';
import type { Variables } from '../../shared/types/context';
import * as mockService from './service';

const mock = new Hono<{ Bindings: Env; Variables: Variables }>();

const CHECKOUT_SCHEMA = z.object({
  booking_id: z.string(),
  amount: z.number(),
  currency: z.string().default('USD'),
  listing_title: z.string(),
});

const ACTION_SCHEMA = z.object({
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
  validator('json', CHECKOUT_SCHEMA),
  async (c) => {
    const ENV = c.env;
    const INPUT = c.req.valid('json');

    const RESULT = await mockService.createPreAuth(
      ENV,
      {
        id: INPUT.booking_id,
        listingTitle: INPUT.listing_title,
        renterFirstName: 'Test',
        renterLastName: 'User',
        renterEmail: 'test@example.com',
        renterPhone: '+85512345678',
        ownerId: '',
        ownerPaywayBeneficiaryId: '',
      },
      {
        total_renter_pays: INPUT.amount,
        owner_payout: INPUT.amount * 0.88,
      },
    );

    return c.json({
      data: {
        checkout_url: RESULT.checkout_url,
        transaction_id: RESULT.transaction_id,
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
  validator('json', ACTION_SCHEMA),
  async (c) => {
    const ENV = c.env;
    const { transaction_id, action } = c.req.valid('json');

    if (action === 'capture') {
      await mockService.captureWithPayout(ENV, transaction_id);
    } else if (action === 'cancel') {
      await mockService.cancelPreAuth(ENV, transaction_id);
    } else if (action === 'refund') {
      await mockService.refundPayment(ENV, transaction_id);
    }

    const STATUS_MAP: Record<string, string> = {
      capture: 'captured',
      cancel: 'cancelled',
      refund: 'refunded',
    };

    return c.json({
      data: {
        success: true,
        transaction_id,
        action,
        status: STATUS_MAP[action] || 'unknown',
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
    const ENV = c.env;
    const { transaction_id } = c.req.valid('param');

    const RESULT = await mockService.checkTransaction(ENV, transaction_id);

    return c.json({
      data: {
        transaction_id,
        status: RESULT.payment_status,
        amount: RESULT.amount,
        currency: RESULT.currency,
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
    const SUPABASE_ADMIN = c.get('supabaseAdmin');
    const { transaction_id, status } = c.req.valid('json');

    await mockService.simulateCallback(SUPABASE_ADMIN, transaction_id, status);

    return c.json({ success: true, data: { transaction_id, status } });
  },
);

export default mock;
