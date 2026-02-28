import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as messageService from "../../src/services/message.service";

describe("Message Service", () => {
  const mockThread = {
    id: "thread-123",
    listing_id: "listing-123",
    booking_id: null,
    participant_ids: ["user-1", "user-2"],
    last_message_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockMessage = {
    id: "message-123",
    thread_id: "thread-123",
    sender_id: "user-1",
    content: "Hello!",
    read_at: null,
    created_at: "2024-01-01T00:00:00Z",
  };

  const createMockClient = (tableName?: string) => {
    return {
      from: (table: string) => {
        if (table === "message_threads") {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockThread, error: null }),
              }),
              contains: () => ({
                order: () => Promise.resolve({ data: [mockThread], error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockThread, error: null }),
              }),
            }),
          };
        }
        if (table === "messages") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [mockMessage], error: null }),
                }),
                lt: () => ({
                  limit: () => Promise.resolve({ data: [mockMessage], error: null }),
                }),
              }),
              neq: () => ({
                is: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockMessage, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { display_name: "Test User" }, error: null }),
            }),
          }),
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      },
    } as unknown as SupabaseClient;
  };

  describe("createThread", () => {
    test("should create thread successfully", async () => {
      const mockClient = {
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockThread, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await messageService.createThread(mockClient, "user-1", {
        participant_ids: ["user-1", "user-2"],
        listing_id: "listing-123",
      });
      expect(result).toEqual(mockThread);
    });

    test("should throw error when user not participant", async () => {
      await expect(
        messageService.createThread(createMockClient(), "user-3", {
          participant_ids: ["user-1", "user-2"],
        })
      ).rejects.toThrow("You must be a participant in the thread");
    });

    test("should throw error when creation fails", async () => {
      const mockClient = {
        from: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: "Insert failed" } }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        messageService.createThread(mockClient, "user-1", { participant_ids: ["user-1", "user-2"] })
      ).rejects.toThrow("Failed to create thread: Insert failed");
    });
  });

  describe("getThread", () => {
    test("should return thread when found and user is participant", async () => {
      const result = await messageService.getThread(createMockClient(), "thread-123", "user-1");
      expect(result).toEqual(mockThread);
    });

    test("should throw error when thread not found", async () => {
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
        messageService.getThread(mockClient, "nonexistent", "user-1")
      ).rejects.toThrow("Thread not found");
    });

    test("should throw error when user is not participant", async () => {
      await expect(
        messageService.getThread(createMockClient(), "thread-123", "user-3")
      ).rejects.toThrow("You are not a participant in this thread");
    });
  });

  describe("getUserThreads", () => {
    test("should return user threads", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            contains: () => ({
              order: () => Promise.resolve({ data: [mockThread], error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await messageService.getUserThreads(mockClient, "user-1");
      expect(result).toHaveLength(1);
    });

    test("should throw error when fetch fails", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            contains: () => ({
              order: () => Promise.resolve({ data: null, error: { message: "DB error" } }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(messageService.getUserThreads(mockClient, "user-1")).rejects.toThrow(
        "Failed to get threads: DB error"
      );
    });
  });

  describe("sendMessage", () => {
    test("should send message successfully", async () => {
      const result = await messageService.sendMessage(
        createMockClient(),
        "thread-123",
        "user-1",
        "Hello!"
      );
      expect(result).toEqual(mockMessage);
    });

    test("should throw error when sender is not participant", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockThread, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        messageService.sendMessage(mockClient, "thread-123", "user-3", "Hello!")
      ).rejects.toThrow("Not a participant in this thread");
    });

    test("should throw error when sending fails", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "message_threads") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockThread, error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: "Insert failed" } }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      await expect(
        messageService.sendMessage(mockClient, "thread-123", "user-1", "Hello!")
      ).rejects.toThrow("Failed to send message: Insert failed");
    });

    test("should send message and create notification", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "message_threads") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { display_name: "Test User" }, error: null }),
                }),
              }),
            };
          }
          if (table === "messages") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: () => Promise.resolve({ data: mockMessage, error: null }),
                }),
              }),
            };
          }
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        },
      } as unknown as SupabaseClient;

      const result = await messageService.sendMessage(mockClient, "thread-123", "user-1", "Hello!");
      expect(result).toEqual(mockMessage);
    });
  });

  describe("getMessages", () => {
    test("should return messages", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "message_threads") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [mockMessage], error: null }),
                }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      const result = await messageService.getMessages(mockClient, "thread-123", "user-1");
      expect(result).toHaveLength(1);
    });

    test("should throw error when fetch fails", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "message_threads") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: null, error: { message: "DB error" } }),
                }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      await expect(
        messageService.getMessages(mockClient, "thread-123", "user-1")
      ).rejects.toThrow("Failed to get messages: DB error");
    });
  });

  describe("markMessagesAsRead", () => {
    test("should mark messages as read", async () => {
      const mockClient = {
        from: (table: string) => {
          if (table === "message_threads") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockThread, error: null }),
                }),
              }),
            };
          }
          return {
            update: () => ({
              eq: () => ({
                neq: () => ({
                  is: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          };
        },
      } as unknown as SupabaseClient;

      await messageService.markMessagesAsRead(mockClient, "thread-123", "user-1");
    });
  });
});
