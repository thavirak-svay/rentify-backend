import { z } from 'zod';
import { MAX_RENTAL_DAYS, MS_PER_HOUR, SERVICE_FEE_RATE } from '@/constants/pricing';
import { DELIVERY_METHOD, PROTECTION_PLAN } from '@/constants/payment';

export const PricingInputSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    priceHourly: z.number().int().min(1).nullable(),
    priceDaily: z.number().int().min(1),
    priceWeekly: z.number().int().min(1).nullable(),
    depositAmount: z.number().int().min(0).default(0),
    deliveryMethod: z.enum(DELIVERY_METHOD),
    deliveryFee: z.number().int().min(0).default(0),
    protectionPlan: z.enum(PROTECTION_PLAN),
    serviceFeeRate: z.number().min(0).max(1).default(SERVICE_FEE_RATE),
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
