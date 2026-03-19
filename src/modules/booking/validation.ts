import { z } from 'zod';
import { BOOKING_ROLE, type BookingRole } from '@/constants/booking';
import { DELIVERY_METHOD, PROTECTION_PLAN } from '@/constants/payment';

export const createBookingSchema = z.object({
  listing_id: z.uuid(),
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  delivery_method: z.enum(DELIVERY_METHOD).optional(),
  delivery_address: z.string().optional(),
  protection_plan: z.enum(PROTECTION_PLAN).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const bookingQuerySchema = z.object({
  role: z.enum(Object.values(BOOKING_ROLE) as [BookingRole, ...BookingRole[]]).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;