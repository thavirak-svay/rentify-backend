/**
 * Pricing Module
 * Self-contained pricing module with Strategy pattern
 *
 * @example
 * import { calculatePricing, PricingCalculator } from "@/modules/pricing"
 *
 * // Using default calculator
 * const result = calculatePricing(input);
 *
 * // Using custom strategies
 * const calculator = new PricingCalculator([new WeeklyPricingStrategy(), new DailyPricingStrategy()]);
 * const customResult = calculator.calculate(input);
 */

export {
  DailyPricingStrategy,
  HourlyPricingStrategy,
  PricingCalculator,
  type PricingInput,
  type PricingResult,
  type PricingStrategy,
  pricingCalculator,
  WeeklyPricingStrategy,
} from './calculator';
export { PricingInputSchema, type PricingInputSchemaType } from './validation';

import { ValidationError } from '../../shared/lib/errors';
import type { PricingInput, PricingResult } from './calculator';
import { pricingCalculator } from './calculator';
import { PricingInputSchema } from './validation';

/**
 * Calculate pricing with validation
 * Main entry point for pricing calculations
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const RESULT = PricingInputSchema.safeParse(input);
  if (!RESULT.success) {
    throw new ValidationError(`Invalid pricing input: ${RESULT.error.issues.map((i) => i.message).join('; ')}`);
  }
  return pricingCalculator.calculate(input);
}
