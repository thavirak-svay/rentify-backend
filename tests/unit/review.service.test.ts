import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as reviewService from "../../src/services/review.service";

describe("Review Service", () => {
  const mockBooking = {
    id: "booking-123",
    listing_id: "listing-123",
    renter_id: "renter-123",
    owner_id: "owner-123",
    status: "completed",
  };

  const mockReview = {
    id: "review-123",
    booking_id: "booking-123",
    listing_id: "listing-123",
    reviewer_id: "renter-123",
    target_id: "owner-123",
    rating: 5,
    comment: "Great!",
    created_at: "2024-01-01T00:00:00Z",
  };

  const createMockClient = (tableName: string, data: unknown, error: unknown = null) => {
    return {
      from: () => {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data, error }),
              order: () => Promise.resolve({ data: data ? [data] : [], error }),
              eq: (field2: string, value2: unknown) => ({
                single: () => Promise.resolve({ data, error }),
              }),
            }),
            order: () => Promise.resolve({ data: data ? [data] : [], error }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockReview, error }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
  };

  describe("createReview", () => {
    test("should create review successfully", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "bookings") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockBooking, error: null }),
                }),
              }),
            };
          }
          if (table === "reviews") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: () => Promise.resolve({ data: mockReview, error: null }),
                }),
              }),
            };
          }
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockReview, error: null }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      const result = await reviewService.createReview(mockClient, "renter-123", {
        booking_id: "booking-123",
        rating: 5,
        comment: "Great!",
      });
      expect(result).toBeDefined();
    });

    test("should throw error for invalid rating", async () => {
      await expect(
        reviewService.createReview(
          {} as SupabaseClient,
          "renter-123",
          { booking_id: "booking-123", rating: 6 }
        )
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    test("should throw error for rating less than 1", async () => {
      await expect(
        reviewService.createReview(
          {} as SupabaseClient,
          "renter-123",
          { booking_id: "booking-123", rating: 0 }
        )
      ).rejects.toThrow("Rating must be between 1 and 5");
    });

    test("should throw error when booking not found", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: "Not found" } }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        reviewService.createReview(mockClient, "renter-123", {
          booking_id: "nonexistent",
          rating: 5,
        })
      ).rejects.toThrow("Booking not found");
    });

    test("should throw error for non-completed booking", async () => {
      const requestedBooking = { ...mockBooking, status: "requested" };
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: requestedBooking, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        reviewService.createReview(mockClient, "renter-123", {
          booking_id: "booking-123",
          rating: 5,
        })
      ).rejects.toThrow("Can only review completed bookings");
    });

    test("should throw error when user not participant", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockBooking, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        reviewService.createReview(mockClient, "third-party", {
          booking_id: "booking-123",
          rating: 5,
        })
      ).rejects.toThrow("You can only review bookings you participated in");
    });

    test("should throw error when review already exists", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "bookings") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockBooking, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockReview, error: null }),
                }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      await expect(
        reviewService.createReview(mockClient, "renter-123", {
          booking_id: "booking-123",
          rating: 5,
        })
      ).rejects.toThrow("You have already reviewed this booking");
    });
  });

  describe("getListingReviews", () => {
    test("should return listing reviews", async () => {
      const mockClient = createMockClient("reviews", mockReview);
      const result = await reviewService.getListingReviews(mockClient, "listing-123");
      expect(result).toHaveLength(1);
    });

    test("should return empty array when no reviews", async () => {
      const mockClient = createMockClient("reviews", null);
      const result = await reviewService.getListingReviews(mockClient, "listing-123");
      expect(result).toHaveLength(0);
    });
  });

  describe("getUserReviews", () => {
    test("should return user reviews", async () => {
      const mockClient = createMockClient("reviews", mockReview);
      const result = await reviewService.getUserReviews(mockClient, "owner-123");
      expect(result).toHaveLength(1);
    });

    test("should throw error when fetch fails", async () => {
      const mockClient = createMockClient("reviews", null, { message: "DB error" });
      await expect(reviewService.getUserReviews(mockClient, "user-123")).rejects.toThrow(
        "Failed to get reviews: DB error"
      );
    });
  });
});
