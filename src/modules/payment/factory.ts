/**
 * Payment Gateway Factory
 * Factory pattern for creating payment gateway instances
 *
 * @module modules/payment/factory
 */

import type { PaymentGateway } from './gateway';
import { PayWayGateway } from './payway';

export type GatewayType = 'payway' | 'stripe';

const instances: Map<string, PaymentGateway> = new Map();

export function createPaymentGateway(type: GatewayType = 'payway'): PaymentGateway {
  const cached = instances.get(type);
  if (cached) return cached;

  let gateway: PaymentGateway;

  switch (type) {
    case 'payway':
      gateway = new PayWayGateway();
      break;
    default:
      throw new Error(`Unsupported payment gateway: ${type}`);
  }

  instances.set(type, gateway);
  return gateway;
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
  instances.clear();
}

/**
 * Convenience function to get the default gateway
 */
export function getPaymentGateway(): PaymentGateway {
  return getDefaultPaymentGateway();
}
