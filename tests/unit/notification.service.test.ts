import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as notificationService from "../../src/services/notification.service";

describe("Notification Service", () => {
  const createMockClient = (queryMock: {
    select?: () => Promise<{ data: unknown[]; error: unknown }>;
    update?: () => Promise<{ error: unknown }>;
  }) => {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => queryMock.select?.() || Promise.resolve({ data: [], error: null }),
              is: () => queryMock.select?.() || Promise.resolve({ data: [], error: null }),
            }),
            is: () => queryMock.select?.() || Promise.resolve({ data: [], error: null }),
          }),
        }),
        update: () => ({
          eq: () => queryMock.update?.() || Promise.resolve({ error: null }),
          is: () => queryMock.update?.() || Promise.resolve({ error: null }),
        }),
      }),
    } as unknown as SupabaseClient;
  };

  describe("getUserNotifications", () => {
    test("should return notifications", async () => {
      const mockClient = createMockClient({
        select: () =>
          Promise.resolve({
            data: [{ id: "notif-1", title: "Test", body: "Test body" }],
            error: null,
          }),
      });

      const result = await notificationService.getUserNotifications(mockClient, "user-123");
      expect(result).toHaveLength(1);
    });

    test("should return notifications with unread only filter", async () => {
      const mockClient = createMockClient({
        select: () =>
          Promise.resolve({
            data: [{ id: "notif-1", title: "Test", body: "Test body", read_at: null }],
            error: null,
          }),
      });

      const result = await notificationService.getUserNotifications(
        mockClient,
        "user-123",
        50,
        true
      );
      expect(result).toHaveLength(1);
    });

    test("should throw error when fetch fails", async () => {
      const mockClient = createMockClient({
        select: () =>
          Promise.resolve({
            data: null,
            error: { message: "DB error" },
          }),
      });

      await expect(
        notificationService.getUserNotifications(mockClient, "user-123")
      ).rejects.toThrow("Failed to get notifications: DB error");
    });
  });

  describe("markAsRead", () => {
    test("should mark notification as read", async () => {
      const mockClient = createMockClient({
        update: () => Promise.resolve({ error: null }),
      });

      await notificationService.markAsRead(mockClient, "notif-123", "user-123");
    });

    test("should throw error when update fails", async () => {
      const mockClient = createMockClient({
        update: () => Promise.resolve({ error: { message: "Update failed" } }),
      });

      await expect(
        notificationService.markAsRead(mockClient, "notif-123", "user-123")
      ).rejects.toThrow("Failed to mark notification as read: Update failed");
    });
  });

  describe("markAllAsRead", () => {
    test("should mark all notifications as read", async () => {
      const mockClient = createMockClient({
        update: () => Promise.resolve({ error: null }),
      });

      await notificationService.markAllAsRead(mockClient, "user-123");
    });

    test("should throw error when update fails", async () => {
      const mockClient = createMockClient({
        update: () => Promise.resolve({ error: { message: "Update failed" } }),
      });

      await expect(
        notificationService.markAllAsRead(mockClient, "user-123")
      ).rejects.toThrow("Failed to mark all notifications as read: Update failed");
    });
  });

  describe("getUnreadCount", () => {
    test("should return unread count", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  count: 5,
                  error: null,
                }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await notificationService.getUnreadCount(mockClient, "user-123");
      expect(result).toBe(5);
    });

    test("should return 0 when no unread notifications", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  count: 0,
                  error: null,
                }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await notificationService.getUnreadCount(mockClient, "user-123");
      expect(result).toBe(0);
    });

    test("should throw error when fetch fails", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  count: null,
                  error: { message: "DB error" },
                }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        notificationService.getUnreadCount(mockClient, "user-123")
      ).rejects.toThrow("Failed to get unread count: DB error");
    });
  });
});
