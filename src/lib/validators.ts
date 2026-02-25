import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  type: z.enum(["offer", "request"]).default("offer"),
  price_hourly: z.number().int().positive().optional(),
  price_daily: z.number().int().positive(),
  price_weekly: z.number().int().positive().optional(),
  deposit_amount: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  address_text: z.string().optional(),
  address_city: z.string().optional(),
  address_country: z.string().length(2).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  availability_type: z.enum(["flexible", "specific_dates"]).default("flexible"),
  min_rental_hours: z.number().int().positive().default(1),
  max_rental_days: z.number().int().positive().optional(),
  delivery_available: z.boolean().default(false),
  delivery_fee: z.number().int().min(0).default(0),
  pickup_available: z.boolean().default(true),
});

export const updateListingSchema = createListingSchema.partial();

export const listingIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
