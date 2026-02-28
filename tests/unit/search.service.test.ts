import { describe, expect, test, beforeEach } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as searchService from "../../src/services/search.service";
import type { SearchParams } from "../../src/services/search.service";

describe("Search Service", () => {
  const mockSearchResults = [
    {
      id: "listing-1",
      title: "Test Listing",
      description: "Test description",
      type: "offer",
      price_daily: 10000,
      deposit_amount: 0,
      currency: "USD",
      owner_id: "owner-1",
      owner_display_name: "Test Owner",
      owner_avatar_url: null,
      owner_rating: 4.5,
      owner_verified: true,
      listing_rating: 4.8,
      review_count: 10,
      distance_km: 5.5,
      thumbnail_url: "https://example.com/image.jpg",
      created_at: "2024-01-01T00:00:00Z",
    },
  ];

  const createMockSupabase = (results: unknown[], error: unknown = null) => {
    return {
      rpc: () => Promise.resolve({ data: results, error }),
    } as unknown as SupabaseClient;
  };

  describe("searchListings", () => {
    test("should search with basic query", async () => {
      const params: SearchParams = {
        q: "camera",
        limit: 20,
        offset: 0,
        radius: 25,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Listing");
    });

    test("should search with location filters", async () => {
      const params: SearchParams = {
        lat: 11.5564,
        lng: 104.9282,
        radius: 50,
        limit: 10,
        offset: 0,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });

    test("should search with category filter", async () => {
      const params: SearchParams = {
        category: "electronics",
        limit: 10,
        offset: 0,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });

    test("should search with type filter", async () => {
      const params: SearchParams = {
        type: "offer",
        limit: 10,
        offset: 0,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });

    test("should search with price range", async () => {
      const params: SearchParams = {
        min_price: 5000,
        max_price: 20000,
        limit: 10,
        offset: 0,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });

    test("should search with different sort options", async () => {
      const sortOptions: SearchParams["sort"][] = [
        "relevance",
        "price_asc",
        "price_desc",
        "rating",
        "newest",
      ];

      for (const sort of sortOptions) {
        const params: SearchParams = {
          sort,
          limit: 10,
          offset: 0,
        };

        const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
        expect(result).toHaveLength(1);
      }
    });

    test("should handle pagination", async () => {
      const params: SearchParams = {
        limit: 10,
        offset: 20,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });

    test("should return empty array when no results", async () => {
      const params: SearchParams = {
        q: "nonexistent",
        limit: 20,
        offset: 0,
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase([]), params);
      expect(result).toHaveLength(0);
    });

    test("should throw error when RPC fails", async () => {
      const params: SearchParams = {
        q: "test",
        limit: 20,
        offset: 0,
        sort: "relevance",
      };

      await expect(
        searchService.searchListings(createMockSupabase(null, { message: "Database error" }), params)
      ).rejects.toThrow("Search failed: Database error");
    });

    test("should use default limit and offset", async () => {
      const params: SearchParams = {
        q: "test",
        sort: "relevance",
      };

      const result = await searchService.searchListings(createMockSupabase(mockSearchResults), params);
      expect(result).toHaveLength(1);
    });
  });
});
