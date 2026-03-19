import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing, ListingMedia } from "../../src/shared/types/database";
import * as listingService from "../../src/modules/listing/service";

describe("Listing Service", () => {
  const mockListing: Listing = {
    id: "listing-123",
    owner_id: "owner-123",
    category_id: "cat-123",
    title: "Test Listing",
    description: "Test description",
    type: "offer",
    status: "draft",
    price_daily: 10000,
    price_hourly: 1000,
    price_weekly: 50000,
    deposit_amount: 0,
    currency: "USD",
    address_text: "Phnom Penh, Cambodia",
    address_city: "Phnom Penh",
    address_country: "KH",
    location: null,
    delivery_available: true,
    delivery_fee: 5000,
    pickup_available: true,
    min_rental_hours: 1,
    max_rental_days: 30,
    availability_type: "flexible",
    view_count: 0,
    rating_avg: 0,
    rating_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    published_at: null,
    deleted_at: null,
  };

  const createMockClient = (data: unknown, error: unknown = null) => {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              single: () => Promise.resolve({ data, error }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
            order: () => Promise.resolve({ data: [data], error }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data, error }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data, error }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  };

  describe("createListing", () => {
    test("should create listing successfully", async () => {
      const result = await listingService.createListing(
        createMockClient(mockListing),
        "owner-123",
        { title: "New Listing", price_daily: 10000, type: "offer", deposit_amount: 0, currency: "USD", availability_type: "flexible", min_rental_hours: 1, delivery_available: false, delivery_fee: 0, pickup_available: true }
      );
      expect(result.id).toBe("listing-123");
    });

    test("should throw error when creation fails", async () => {
      await expect(
        listingService.createListing(
          createMockClient(null, { message: "Insert failed" }),
          "owner-123",
          { title: "New Listing", price_daily: 10000, type: "offer", deposit_amount: 0, currency: "USD", availability_type: "flexible", min_rental_hours: 1, delivery_available: false, delivery_fee: 0, pickup_available: true }
        )
      ).rejects.toThrow("Failed to create listing: Insert failed");
    });
  });

  describe("getListing", () => {
    test("should return listing when found", async () => {
      const result = await listingService.getListing(createMockClient(mockListing), "listing-123");
      expect(result.id).toBe("listing-123");
    });

    test("should throw error when listing not found", async () => {
      await expect(
        listingService.getListing(createMockClient(null, { message: "Not found" }), "nonexistent")
      ).rejects.toThrow("Listing not found");
    });
  });

  describe("getListingWithMedia", () => {
    test("should return listing with media", async () => {
      const mockMedia: ListingMedia[] = [
        { id: "media-1", listing_id: "listing-123", url: "https://example.com/1.jpg", thumbnail_url: null, sort_order: 0, is_primary: true, created_at: "2024-01-01T00:00:00Z" },
        { id: "media-2", listing_id: "listing-123", url: "https://example.com/2.jpg", thumbnail_url: null, sort_order: 1, is_primary: false, created_at: "2024-01-01T00:00:00Z" },
      ];

      const mediaClient = {
        from: (table: string) => {
          if (table === "listing_media") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => Promise.resolve({ data: mockMedia, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  single: () => Promise.resolve({ data: mockListing, error: null }),
                }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      const result = await listingService.getListingWithMedia(mediaClient, "listing-123");
      expect(result.listing.id).toBe("listing-123");
      expect(result.media).toHaveLength(2);
    });
  });

  describe("updateListing", () => {
    test("should update listing when owner is correct", async () => {
      const result = await listingService.updateListing(
        createMockClient(mockListing),
        "listing-123",
        "owner-123",
        { title: "Updated Title" }
      );
      expect(result.id).toBe("listing-123");
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        listingService.updateListing(
          createMockClient(mockListing),
          "listing-123",
          "other-user",
          { title: "Updated Title" }
        )
      ).rejects.toThrow("You can only modify your own listing");
    });
  });

  describe("deleteListing", () => {
    test("should delete listing when owner is correct", async () => {
      await listingService.deleteListing(createMockClient(mockListing), "listing-123", "owner-123");
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        listingService.deleteListing(createMockClient(mockListing), "listing-123", "other-user")
      ).rejects.toThrow("You can only modify your own listing");
    });
  });

  describe("publishListing", () => {
    test("should publish listing when owner is correct", async () => {
      const publishedListing = { ...mockListing, status: "active" as const, published_at: "2024-01-02T00:00:00Z" };
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () => ({
                single: () => Promise.resolve({ data: mockListing, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: publishedListing, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;
      
      const result = await listingService.publishListing(mockClient, "listing-123", "owner-123");
      expect(result.status).toBe("active");
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        listingService.publishListing(createMockClient(mockListing), "listing-123", "other-user")
      ).rejects.toThrow("You can only modify your own listing");
    });

    test("should throw error when listing is not draft", async () => {
      const activeListing = { ...mockListing, status: "active" as const };
      await expect(
        listingService.publishListing(createMockClient(activeListing), "listing-123", "owner-123")
      ).rejects.toThrow("Only draft listings can be published");
    });
  });

  describe("getUserListings", () => {
    test("should return user listings", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () => ({
                order: () => Promise.resolve({ data: [mockListing], error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listingService.getUserListings(mockClient, "owner-123");
      expect(result).toHaveLength(1);
    });

    test("should return empty array when no listings", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await listingService.getUserListings(mockClient, "new-user");
      expect(result).toHaveLength(0);
    });
  });
});