import { z } from 'zod';
import { COUNTRY_CODE_LENGTH } from '@/constants/user';
import {
  CURRENCY_CODE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
} from '@/constants/listing';
import { DEFAULT_CURRENCY } from '@/constants/payment';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@/constants/api';

export const LISTING_TYPE = {
  OFFER: 'offer',
  REQUEST: 'request',
} as const;

export type ListingType = (typeof LISTING_TYPE)[keyof typeof LISTING_TYPE];

export const LISTING_SORT = {
  RELEVANCE: 'relevance',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
  NEWEST: 'newest',
} as const;

export type ListingSort = (typeof LISTING_SORT)[keyof typeof LISTING_SORT];

export const AVAILABILITY_TYPE = {
  FLEXIBLE: 'flexible',
  SPECIFIC_DATES: 'specific_dates',
} as const;

export type AvailabilityType = (typeof AVAILABILITY_TYPE)[keyof typeof AVAILABILITY_TYPE];

export const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['offer', 'request'] as const).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest'] as const).default(LISTING_SORT.RELEVANCE),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export const createListingSchema = z.object({
  title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  category_id: z.uuid().optional(),
  type: z.enum(['offer', 'request'] as const).default(LISTING_TYPE.OFFER),
  price_hourly: z.number().int().positive().optional(),
  price_daily: z.number().int().positive(),
  price_weekly: z.number().int().positive().optional(),
  deposit_amount: z.number().int().min(0).default(0),
  currency: z.string().length(CURRENCY_CODE_LENGTH).default(DEFAULT_CURRENCY),
  address_text: z.string().optional(),
  address_city: z.string().optional(),
  address_country: z.string().length(COUNTRY_CODE_LENGTH).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  availability_type: z.enum(['flexible', 'specific_dates'] as const).default(AVAILABILITY_TYPE.FLEXIBLE),
  min_rental_hours: z.number().int().positive().default(1),
  max_rental_days: z.number().int().positive().optional(),
  delivery_available: z.boolean().default(false),
  delivery_fee: z.number().int().min(0).default(0),
  pickup_available: z.boolean().default(true),
});

export const updateListingSchema = createListingSchema.partial();

export const listingIdSchema = z.object({
  id: z.uuid(),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;