import { z } from 'zod';
import { MAX_RENTAL_DAYS, MS_PER_HOUR } from '../../constants';

export const PricingInputSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    priceHourly: z.number().int().min(1).nullable(),
    priceDaily: z.number().int().min(1),
    priceWeekly: z.number().int().min(1).nullable(),
    depositAmount: z.number().int().min(0).default(0),
    deliveryMethod: z.enum(['pickup', 'delivery']),
    deliveryFee: z.number().int().min(0).default(0),
    protectionPlan: z.enum(['none', 'basic', 'premium']),
    serviceFeeRate: z.number().min(0).max(1).default(0.12),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine(
    (d) => {
      const DAYS = Math.ceil((d.endTime.getTime() - d.startTime.getTime()) / (MS_PER_HOUR * 24));
      return DAYS <= MAX_RENTAL_DAYS;
    },
    {
      message: `Rental period cannot exceed ${MAX_RENTAL_DAYS} days`,
      path: ['endTime'],
    },
  );

export type PricingInputSchemaType = z.infer<typeof PricingInputSchema>;
