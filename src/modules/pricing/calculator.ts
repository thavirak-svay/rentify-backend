import {
  DELIVERY_METHOD,
  type DeliveryMethodType,
  OWNER_COMMISSION_RATE,
  PROTECTION_RATES,
  type ProtectionPlan,
  SERVICE_FEE_RATE,
} from '@/constants';
import { ValidationError } from '@/shared/lib/errors';

export interface PricingInput {
  startTime: Date;
  endTime: Date;
  priceHourly: number | null;
  priceDaily: number;
  priceWeekly: number | null;
  depositAmount: number;
  deliveryMethod: DeliveryMethodType;
  deliveryFee: number;
  protectionPlan: ProtectionPlan;
  serviceFeeRate?: number;
}

export interface PricingResult {
  subtotal: number;
  service_fee: number;
  delivery_fee: number;
  protection_fee: number;
  deposit_amount: number;
  total_renter_pays: number;
  owner_payout: number;
  rental_days: number;
  rental_hours: number;
}

export interface PricingStrategy {
  readonly name: string;
  canHandle(input: PricingInput, hours: number, days: number): boolean;
  calculate(input: PricingInput, hours: number, days: number): number;
}

export class HourlyPricingStrategy implements PricingStrategy {
  readonly name = 'hourly';

  canHandle(input: PricingInput, hours: number): boolean {
    return hours < 8 && input.priceHourly !== null;
  }

  calculate(input: PricingInput, hours: number): number {
    if (!input.priceHourly) return input.priceDaily;
    return input.priceHourly * hours;
  }
}

/**
 * Daily pricing strategy - default strategy
 */
export class DailyPricingStrategy implements PricingStrategy {
  readonly name = 'daily';

  canHandle(): boolean {
    return true; // Daily is always a valid fallback
  }

  calculate(input: PricingInput, _hours: number, days: number): number {
    return input.priceDaily * days;
  }
}

/**
 * Weekly pricing strategy - for extended rentals
 */
export class WeeklyPricingStrategy implements PricingStrategy {
  readonly name = 'weekly';

  canHandle(input: PricingInput, _hours: number, days: number): boolean {
    return input.priceWeekly !== null && days >= 5;
  }

  calculate(input: PricingInput, _hours: number, days: number): number {
    if (!input.priceWeekly) return input.priceDaily * days;

    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    const weeklyTotal = weeks * input.priceWeekly + remainingDays * input.priceDaily;

    // For 7+ days, compare weekly rate vs daily
    if (days >= 7) {
      return Math.min(weeklyTotal, input.priceDaily * days);
    }

    // For 5-6 days, compare weekly rate vs daily
    return Math.min(input.priceWeekly, input.priceDaily * days);
  }
}

/**
 * Pricing Calculator Context
 * Uses Strategy pattern to select appropriate pricing algorithm
 */
export class PricingCalculator {
  private readonly strategies: PricingStrategy[];

  constructor(strategies: PricingStrategy[] = []) {
    this.strategies = strategies.length > 0 ? strategies : [new HourlyPricingStrategy(), new WeeklyPricingStrategy(), new DailyPricingStrategy()];
  }

  /**
   * Calculate rental duration
   */
  private static getDuration(startTime: Date, endTime: Date) {
    // Validate Date objects
    if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
      throw new ValidationError('Invalid start time: must be a valid Date');
    }
    if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) {
      throw new ValidationError('Invalid end time: must be a valid Date');
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new ValidationError('End time must be after start time');
    }
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    return { hours: Math.max(1, hours), days: Math.ceil(hours / 24) };
  }

  /**
   * Select the best strategy for the given input
   */
  selectStrategy(input: PricingInput, hours: number, days: number): PricingStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(input, hours, days)) {
        return strategy;
      }
    }
    // Fallback to daily (should never reach here if DailyPricingStrategy is included)
    return new DailyPricingStrategy();
  }

  calculate(input: PricingInput): PricingResult {
    // Validate protection plan
    if (!(input.protectionPlan in PROTECTION_RATES)) {
      throw new ValidationError(`Invalid protection plan: ${input.protectionPlan}`);
    }

    const { hours, days } = PricingCalculator.getDuration(input.startTime, input.endTime);

    const strategy = this.selectStrategy(input, hours, days);
    const subtotal = strategy.calculate(input, hours, days);

    const serviceFee = Math.round(subtotal * (input.serviceFeeRate ?? SERVICE_FEE_RATE));
    const deliveryFee = input.deliveryMethod === DELIVERY_METHOD.DELIVERY ? input.deliveryFee : 0;
    const protectionRate = PROTECTION_RATES[input.protectionPlan] ?? 0;
    const protectionFee = Math.round(subtotal * protectionRate);

    return {
      subtotal: subtotal,
      service_fee: serviceFee,
      delivery_fee: deliveryFee,
      protection_fee: protectionFee,
      deposit_amount: input.depositAmount,
      total_renter_pays: subtotal + serviceFee + deliveryFee + protectionFee + input.depositAmount,
      owner_payout: subtotal - Math.round(subtotal * OWNER_COMMISSION_RATE),
      rental_days: days,
      rental_hours: hours,
    };
  }
}

export const pricingCalculator = new PricingCalculator();
