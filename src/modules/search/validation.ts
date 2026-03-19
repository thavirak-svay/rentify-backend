import { z } from 'zod';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@/constants/api';
import { DEFAULT_SEARCH_RADIUS_KM, MAX_SEARCH_RADIUS_KM } from '@/constants/search';
import { LISTING_SORT } from '@/modules/listing/validation';

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(MAX_SEARCH_RADIUS_KM).default(DEFAULT_SEARCH_RADIUS_KM),
  category: z.string().optional(),
  type: z.enum(['offer', 'request'] as const).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest'] as const).default(LISTING_SORT.RELEVANCE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;