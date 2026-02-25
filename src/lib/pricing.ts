import { z } from "zod";

export const PricingInputSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  priceHourly: z.number().int().nullable(),
  priceDaily: z.number().int(),
  priceWeekly: z.number().int().nullable(),
  depositAmount: z.number().int().default(0),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryFee: z.number().int().default(0),
  protectionPlan: z.enum(["none", "basic", "premium"]),
  serviceFeeRate: z.number().default(0.12),
});

export type PricingInput = z.infer<typeof PricingInputSchema>;

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

export function calculatePricing(input: PricingInput): PricingResult {
  const hours = Math.ceil((input.endTime.getTime() - input.startTime.getTime()) / (1000 * 60 * 60));
  const days = Math.ceil(hours / 24);
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;

  let subtotal: number;

  // Determine best pricing strategy
  if (hours < 8 && input.priceHourly) {
    // Use hourly rate for short rentals
    subtotal = input.priceHourly * hours;
  } else if (input.priceWeekly && days >= 5) {
    // Compare weekly vs daily pricing for 5+ day rentals
    const weeklyTotal = weeks * input.priceWeekly + remainingDays * input.priceDaily;
    const dailyTotal = days * input.priceDaily;
    
    // Special case: for 5-6 days, consider using a full week if cheaper
    const fullWeekTotal = input.priceWeekly;
    const comparisonTotal = days >= 7 ? weeklyTotal : fullWeekTotal;
    
    subtotal = Math.min(comparisonTotal, dailyTotal);
  } else {
    // Use daily rate
    subtotal = input.priceDaily * days;
  }

  // Calculate fees
  const serviceFee = Math.round(subtotal * input.serviceFeeRate);
  const deliveryFee = input.deliveryMethod === "delivery" ? input.deliveryFee : 0;

  // Calculate protection fee
  let protectionFee = 0;
  if (input.protectionPlan === "basic") {
    protectionFee = Math.round(subtotal * 0.05);
  } else if (input.protectionPlan === "premium") {
    protectionFee = Math.round(subtotal * 0.1);
  }

  // Calculate totals
  const total = subtotal + serviceFee + deliveryFee + protectionFee;
  const ownerPayout = subtotal - Math.round(subtotal * 0.06); // 6% owner commission

  return {
    subtotal,
    service_fee: serviceFee,
    delivery_fee: deliveryFee,
    protection_fee: protectionFee,
    deposit_amount: input.depositAmount,
    total_renter_pays: total + input.depositAmount, // deposit is auth hold, not charge
    owner_payout: ownerPayout,
    rental_days: days,
    rental_hours: hours,
  };
}
