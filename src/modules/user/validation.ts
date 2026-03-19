import { z } from 'zod';
import {
  COUNTRY_CODE_LENGTH,
  MAX_BANK_ACCOUNT_LENGTH,
  MAX_BIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from '@/constants/user';

export const updateProfileSchema = z.object({
  display_name: z.string().min(MIN_DISPLAY_NAME_LENGTH).max(MAX_DISPLAY_NAME_LENGTH).optional(),
  avatar_url: z.url().optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  address_city: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  address_country: z.string().length(COUNTRY_CODE_LENGTH).optional(),
  bank_name: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  bank_account_masked: z.string().max(MAX_BANK_ACCOUNT_LENGTH).optional(),
  payway_beneficiary_id: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;