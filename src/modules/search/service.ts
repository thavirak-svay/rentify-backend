import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { DatabaseError, ValidationError } from '../../shared/lib/errors';

const SEARCH_PARAMS_SCHEMA = z.object({
  q: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().default(25),
  category: z.string().optional(),
  type: z.enum(['offer', 'request']).optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).default('relevance'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchParams = z.infer<typeof SEARCH_PARAMS_SCHEMA>;

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  type: 'offer' | 'request';
  price_daily: number;
  deposit_amount: number;
  currency: string;
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string | null;
  owner_rating: number;
  owner_verified: boolean;
  listing_rating: number;
  review_count: number;
  distance_km: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

export async function searchListings(supabaseAdmin: SupabaseClient, params: SearchParams): Promise<SearchResult[]> {
  // Validate that both lat and lng are provided together for location search
  const HAS_LAT = params.lat !== undefined;
  const HAS_LNG = params.lng !== undefined;
  if (HAS_LAT !== HAS_LNG) {
    throw new ValidationError('Both latitude and longitude must be provided together for location search');
  }

  const { data, error } = await supabaseAdmin.rpc('search_listings', {
    search_query: params.q || null,
    search_lat: params.lat || null,
    search_lng: params.lng || null,
    search_radius_km: params.radius,
    category_slug: params.category || null,
    listing_type: params.type || null,
    price_min: params.min_price || null,
    price_max: params.max_price || null,
    sort_by: params.sort,
    result_limit: params.limit,
    result_offset: params.offset,
  });

  if (error) {
    throw new DatabaseError(`Search failed: ${error.message}`);
  }

  return data || [];
}
