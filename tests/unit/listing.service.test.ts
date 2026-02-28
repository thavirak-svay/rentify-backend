import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as listingService from "../../src/services/listing.service";

describe("Listing Service", () => {
  const mockListing = {
    id: "listing-123",
    owner_id: "owner-123",
    title: "Test Listing",
    description: "Test description",
    status: "draft",
    price_daily: 10000,
    price_hourly: 1000,
    price_weekly: 50000,
    deposit_amount: 0,
    currency: "USD",
    type: "offer",
    category_id: "cat-123",
    address_city: "Phnom Penh",
    address_country: "KH",
    delivery_available: true,
    delivery_fee: 5000,
    pickup_available: true,
    min_rental_hours: 1,
    max_rental_days: 30,
    availability_type: "flexible",
    created_at: "2024-01-01T00:00:00Z",
    published_at: null,
    deleted_at: null,
  };

  const createMockClient = (tableName: string, data: unknown, error: unknown = null) => {
    return {
      from: (table: string) => {
        return {
          select: () => ({
            eq: (field: string, value: string) => ({
              is: (field: string, value: unknown) => ({
                single: () => Promise.resolve({ data, error }),
              }),
              order: () => Promise.resolve({ data: [data], error }),
            }),
            "*": () => ({
              eq: (field: string, value: string) => ({
                is: (field: string, value: unknown) => ({
                  single: () => Promise.resolve({ data, error }),
                }),
              }),
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
        };
      },
    } as unknown as SupabaseClient;
  };

  describe("createListing", () => {
    test("should create listing successfully", async () => {
      const result = await listingService.createListing(
        createMockClient("listings", mockListing),
        "owner-123",
        { title: "New Listing", price_daily: 10000 }
      );
      expect(result).toEqual(mockListing);
    });

    test("should throw error when creation fails", async () => {
      await expect(
        listingService.createListing(
          createMockClient("listings", null, { message: "Insert failed" }),
          "owner-123",
          { title: "New Listing", price_daily: 10000 }
        )
      ).rejects.toThrow("Failed to create listing: Insert failed");
    });
  });

  describe("getListing", () => {
    test("should return listing when found", async () => {
      const result = await listingService.getListing(createMockClient("listings", mockListing), "listing-123");
      expect(result).toEqual(mockListing);
    });

    test("should throw error when listing not found", async () => {
      await expect(
        listingService.getListing(createMockClient("listings", null, { message: "Not found" }), "nonexistent")
      ).rejects.toThrow("Listing not found");
    });
  });

  describe("getListingWithMedia", () => {
    test("should return listing with media", async () => {
      const mockMedia = [
        { id: "media-1", listing_id: "listing-123", url: "https://example.com/1.jpg" },
        { id: "media-2", listing_id: "listing-123", url: "https://example.com/2.jpg" },
      ];

      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () => ({
                single: () => Promise.resolve({ data: mockListing, error: null }),
              }),
            }),
          }),
        }),
        _media: mockMedia,
      };

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
          return mockClient.from(table);
        },
      } as unknown as SupabaseClient;

      const result = await listingService.getListingWithMedia(mediaClient, "listing-123");
      expect(result.listing).toEqual(mockListing);
    });
  });

  describe("updateListing", () => {
    test("should update listing when owner is correct", async () => {
      const result = await listingService.updateListing(
        createMockClient("listings", mockListing),
        "listing-123",
        "owner-123",
        { title: "Updated Title" }
      );
      expect(result).toEqual(mockListing);
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        listingService.updateListing(
          createMockClient("listings", mockListing),
          "listing-123",
          "other-user",
          { title: "Updated Title" }
        )
      ).rejects.toThrow("You can only update your own listings");
    });

    test("should handle location update", async () => {
      await listingService.updateListing(
        createMockClient("listings", mockListing),
        "listing-123",
        "owner-123",
        { location: { lat: 11.5564, lng: 104.9282 } }
      );
    });
  });

  describe("deleteListing", () => {
    test("should delete listing when owner is correct", async () => {
      await listingService.deleteListing(createMockClient("listings", mockListing), "listing-123", "owner-123");
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        listingService.deleteListing(createMockClient("listings", mockListing), "listing-123", "other-user")
      ).rejects.toThrow("You can only delete your own listings");
    });
  });

  describe("publishListing", () => {
    test("should publish listing when owner is correct", async () => {
      const publishedListing = { ...mockListing, status: "active", published_at: "2024-01-02T00:00:00Z" };
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
        listingService.publishListing(createMockClient("listings", mockListing), "listing-123", "other-user")
      ).rejects.toThrow("You can only publish your own listings");
    });

    test("should throw error when listing is not draft", async () => {
      const activeListing = { ...mockListing, status: "active" };
      await expect(
        listingService.publishListing(createMockClient("listings", activeListing), "listing-123", "owner-123")
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
