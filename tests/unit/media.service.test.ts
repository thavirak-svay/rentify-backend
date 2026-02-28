import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as mediaService from "../../src/services/media.service";

describe("Media Service", () => {
  const createMockClient = () => {
    return {
      storage: {
        from: () => ({
          createSignedUploadUrl: () =>
            Promise.resolve({
              data: { signedUrl: "https://signed.url" },
              error: null,
            }),
          getPublicUrl: () => ({
            data: { publicUrl: "https://public.url" },
          }),
          remove: () => Promise.resolve({ data: {}, error: null }),
        }),
      },
      from: (table: string) => {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "media-1", listing_id: "listing-123", url: "https://example.com/1.jpg", listings: { owner_id: "owner-123" } },
                  error: null,
                }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "media-1", url: "https://example.com/1.jpg" },
                  error: null,
                }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      },
    } as unknown as SupabaseClient;
  };

  describe("createUploadUrl", () => {
    test("should create upload URL successfully", async () => {
      const result = await mediaService.createUploadUrl(createMockClient(), "user-123", "test.jpg");
      expect(result.upload_url).toBe("https://signed.url");
      expect(result.path).toContain("uploads/user-123");
      expect(result.public_url).toBe("https://public.url");
    });

    test("should throw error when creating upload URL fails", async () => {
      const mockClient = {
        storage: {
          from: () => ({
            createSignedUploadUrl: () =>
              Promise.resolve({
                data: null,
                error: { message: "Failed to create URL" },
              }),
          }),
        },
      } as unknown as SupabaseClient;

      await expect(
        mediaService.createUploadUrl(mockClient, "user-123", "test.jpg")
      ).rejects.toThrow("Failed to create upload URL: Failed to create URL");
    });
  });

  describe("confirmUpload", () => {
    test("should confirm upload successfully", async () => {
      const result = await mediaService.confirmUpload(
        createMockClient(),
        "user-123",
        "listing-123",
        "uploads/user-123/test.jpg",
        true
      );
      expect(result.id).toBe("media-1");
    });

    test("should throw error when confirming upload fails", async () => {
      const mockClient = {
        storage: {
          from: () => ({
            getPublicUrl: () => ({
              data: { publicUrl: "https://public.url" },
            }),
          }),
        },
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "Insert failed" },
                }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        mediaService.confirmUpload(mockClient, "user-123", "listing-123", "path", false)
      ).rejects.toThrow("Failed to confirm upload: Insert failed");
    });
  });

  describe("deleteMedia", () => {
    test("should delete media successfully when owner", async () => {
      await mediaService.deleteMedia(createMockClient(), "owner-123", "media-1");
    });

    test("should throw error when user is not owner", async () => {
      await expect(
        mediaService.deleteMedia(createMockClient(), "other-user", "media-1")
      ).rejects.toThrow("You can only delete your own media");
    });

    test("should throw error when media not found", async () => {
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
        mediaService.deleteMedia(mockClient, "owner-123", "nonexistent")
      ).rejects.toThrow("Media not found");
    });
  });
});
