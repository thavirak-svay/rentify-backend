import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import type { Env } from '@/config/env';
import { MERCHANT_ACTION, TRANSACTION_STATUS } from '@/constants/payment';
import { createMockPaymentClient } from '@/client/mock';
import { dataResponse, successResponse } from '@/shared/lib/openapi';
import type { Variables } from '@/shared/types/context';
import { actionSchema, checkoutSchema, simulateCallbackSchema, transactionIdParamSchema } from './validation';

const mock = new Hono<{ Bindings: Env; Variables: Variables }>();

mock.post(
  '/checkout',
  describeRoute({
    tags: ['Mock'],
    summary: 'Create mock payment checkout (testing only)',
    responses: {
      200: dataResponse(
        checkoutSchema,
        'Checkout created',
      ),
    },
  }),
  validator('json', checkoutSchema),
  async (c) => {
    const env = c.env;
    const input = c.req.valid('json');

    const client = createMockPaymentClient(env);
    const result = await client.createPreAuth(
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
        actionSchema,
        'Action executed',
      ),
    },
  }),
  validator('json', actionSchema),
  async (c) => {
    const env = c.env;
    const { transaction_id, action } = c.req.valid('json');

    const client = createMockPaymentClient(env);

    if (action === MERCHANT_ACTION.CAPTURE) {
      await client.capture(transaction_id);
    } else if (action === MERCHANT_ACTION.CANCEL) {
      await client.cancelPreAuth(transaction_id);
    } else if (action === MERCHANT_ACTION.REFUND) {
      await client.refund(transaction_id);
    }

    const statusMap: Record<string, string> = {
      [MERCHANT_ACTION.CAPTURE]: TRANSACTION_STATUS.COMPLETED,
      [MERCHANT_ACTION.CANCEL]: TRANSACTION_STATUS.CANCELLED,
      [MERCHANT_ACTION.REFUND]: TRANSACTION_STATUS.REFUNDED,
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
        actionSchema,
        'Transaction status',
      ),
    },
  }),
  validator('param', transactionIdParamSchema),
  async (c) => {
    const env = c.env;
    const { transaction_id } = c.req.valid('param');

    const client = createMockPaymentClient(env);
    const result = await client.checkTransaction(transaction_id);

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
  validator('json', simulateCallbackSchema),
  async (c) => {
    const supabaseAdmin = c.get('supabaseAdmin');
    const { transaction_id, status } = c.req.valid('json');

    const { data: transaction } = await supabaseAdmin.from('transactions').select('booking_id').eq('payway_tran_id', transaction_id).single();

    if (transaction) {
      await supabaseAdmin
        .from('transactions')
        .update({
          status: status === 'APPROVED' ? TRANSACTION_STATUS.AUTHORIZED : TRANSACTION_STATUS.FAILED,
        })
        .eq('payway_tran_id', transaction_id);

      if (status === 'APPROVED') {
        await supabaseAdmin.from('bookings').update({ payment_authorized: true }).eq('id', transaction.booking_id);
      }
    }

    return c.json({ success: true, data: { transaction_id, status } });
  },
);

export default mock;
