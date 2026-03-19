import { z } from 'zod';
import { DELIVERY_METHOD, MAX_RENTAL_DAYS, MS_PER_HOUR, PROTECTION_PLAN } from '@/constants';

export const PricingInputSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    priceHourly: z.number().int().min(1).nullable(),
    priceDaily: z.number().int().min(1),
    priceWeekly: z.number().int().min(1).nullable(),
    depositAmount: z.number().int().min(0).default(0),
    deliveryMethod: z.nativeEnum(DELIVERY_METHOD),
    deliveryFee: z.number().int().min(0).default(0),
    protectionPlan: z.nativeEnum(PROTECTION_PLAN),
    serviceFeeRate: z.number().min(0).max(1).default(0.12),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine(
    (d) => {
      const days = Math.ceil((d.endTime.getTime() - d.startTime.getTime()) / (MS_PER_HOUR * 24));
      return days <= MAX_RENTAL_DAYS;
    },
    {
      message: `Rental period cannot exceed ${MAX_RENTAL_DAYS} days`,
      path: ['endTime'],
    },
  );

export type PricingInputSchemaType = z.infer<typeof PricingInputSchema>;
