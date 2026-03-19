/**
 * Payment Gateway Factory
 * Factory pattern for creating payment gateway instances
 *
 * @module modules/payment/factory
 */

import type { Env } from '@/config/env';
import { PayWayClient } from '@/client/payway';
import { MockPaymentClient } from '@/client/mock';
import type { PaymentGateway } from './gateway';

export type GatewayType = 'payway' | 'mock';

const instances: Map<string, PaymentGateway> = new Map();

export function createPaymentGateway(env: Env, type: GatewayType = 'payway'): PaymentGateway {
  const cacheKey = `${type}-${env.PAYWAY_MERCHANT_ID}`;
  const cached = instances.get(cacheKey);
  if (cached) return cached;

  let gateway: PaymentGateway;

  switch (type) {
    case 'payway':
      gateway = new PayWayClient(env);
      break;
    case 'mock':
      gateway = new MockPaymentClient(env);
      break;
    default:
      throw new Error(`Unsupported payment gateway: ${type}`);
  }

  instances.set(cacheKey, gateway);
  return gateway;
}

/**
 * Get the default gateway (PayWay for Cambodia market)
 */
export function getDefaultPaymentGateway(env: Env): PaymentGateway {
  return createPaymentGateway(env, 'payway');
}

/**
 * Clear cached instances (useful for testing)
 */
export function clearPaymentGatewayCache(): void {
  instances.clear();
}

/**
 * Convenience function to get the default gateway
 */
export function getPaymentGateway(env: Env): PaymentGateway {
  return getDefaultPaymentGateway(env);
}
