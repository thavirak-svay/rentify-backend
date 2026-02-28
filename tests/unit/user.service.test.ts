import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as userService from "../../src/services/user.service";

describe("User Service", () => {
  const mockProfile = {
    id: "user-123",
    display_name: "Test User",
    avatar_url: "https://example.com/avatar.jpg",
    bio: "Test bio",
    rating_avg: 4.5,
    rating_count: 10,
    completed_rentals: 5,
    identity_status: "verified",
    created_at: "2024-01-01T00:00:00Z",
    address_city: "Phnom Penh",
    address_country: "KH",
    bank_name: "ACLEDA Bank",
    bank_account_masked: "****1234",
    payway_beneficiary_id: "ben-123",
  };

  const createMockSupabase = (profile: unknown, error: unknown = null) => {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profile, error }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: profile, error }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  };

  describe("getProfile", () => {
    test("should return profile when found", async () => {
      const result = await userService.getProfile(createMockSupabase(mockProfile), "user-123");
      expect(result).toEqual(mockProfile);
    });

    test("should throw error when profile not found", async () => {
      await expect(
        userService.getProfile(createMockSupabase(null, { message: "Not found" }), "nonexistent")
      ).rejects.toThrow("Profile not found");
    });
  });

  describe("getPublicProfile", () => {
    test("should return public profile fields", async () => {
      const result = await userService.getPublicProfile(createMockSupabase(mockProfile), "user-123");
      expect(result.id).toBe(mockProfile.id);
      expect(result.display_name).toBe(mockProfile.display_name);
      expect(result.avatar_url).toBe(mockProfile.avatar_url);
      expect(result.bio).toBe(mockProfile.bio);
      expect(result.rating_avg).toBe(mockProfile.rating_avg);
      expect(result.rating_count).toBe(mockProfile.rating_count);
      expect(result.completed_rentals).toBe(mockProfile.completed_rentals);
      expect(result.identity_status).toBe(mockProfile.identity_status);
      expect(result.created_at).toBe(mockProfile.created_at);
    });
  });

  describe("updateProfile", () => {
    test("should update profile successfully", async () => {
      const result = await userService.updateProfile(
        createMockSupabase(mockProfile),
        "user-123",
        { display_name: "New Name" }
      );
      expect(result).toEqual(mockProfile);
    });

    test("should throw error when update fails", async () => {
      await expect(
        userService.updateProfile(
          createMockSupabase(null, { message: "Update failed" }),
          "user-123",
          { display_name: "New Name" }
        )
      ).rejects.toThrow("Failed to update profile: Update failed");
    });

    test("should validate profile input - invalid display name length", async () => {
      const result = userService.updateProfileSchema.safeParse({
        display_name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    test("should accept valid profile input", async () => {
      const result = userService.updateProfileSchema.safeParse({
        display_name: "Valid Name",
        bio: "Valid bio",
        avatar_url: "https://example.com/avatar.jpg",
      });
      expect(result.success).toBe(true);
    });

    test("should reject invalid avatar URL", async () => {
      const result = userService.updateProfileSchema.safeParse({
        avatar_url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    test("should reject invalid country code", async () => {
      const result = userService.updateProfileSchema.safeParse({
        address_country: "USA",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateLastActive", () => {
    test("should update last_active_at", async () => {
      const mockFrom = {
        from: () => ({
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      await userService.updateLastActive(mockFrom, "user-123");
    });
  });
});
