import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().default(25),
  category: z.string().optional(),
  type: z.enum(["offer", "request"]).optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "rating", "newest"]).default("relevance"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  type: "offer" | "request";
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
  first_image_url: string | null;
  created_at: string;
}

export async function searchListings(
  supabaseAdmin: SupabaseClient,
  params: SearchParams
): Promise<SearchResult[]> {
  const { data, error } = await supabaseAdmin.rpc("search_listings", {
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
    throw new Error(`Search failed: ${error.message}`);
  }

  return data || [];
}
