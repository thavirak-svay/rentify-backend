/**
 * Payment Gateway Factory
 * Factory pattern for creating payment gateway instances
 *
 * @module modules/payment/factory
 */

import type { PaymentGateway } from './gateway';
import { PayWayGateway } from './payway';

export type GatewayType = 'payway' | 'stripe';

const INSTANCES: Map<string, PaymentGateway> = new Map();

export function createPaymentGateway(type: GatewayType = 'payway'): PaymentGateway {
  const CACHED = INSTANCES.get(type);
  if (CACHED) return CACHED;

  let GATEWAY: PaymentGateway;

  switch (type) {
    case 'payway':
      GATEWAY = new PayWayGateway();
      break;
    default:
      throw new Error(`Unsupported payment gateway: ${type}`);
  }

  INSTANCES.set(type, GATEWAY);
  return GATEWAY;
}

/**
 * Get the default gateway (PayWay for Cambodia market)
 */
export function getDefaultPaymentGateway(): PaymentGateway {
  return createPaymentGateway('payway');
}

/**
 * Clear cached instances (useful for testing)
 */
export function clearPaymentGatewayCache(): void {
  INSTANCES.clear();
}

/**
 * Convenience function to get the default gateway
 */
export function getPaymentGateway(): PaymentGateway {
  return getDefaultPaymentGateway();
}
