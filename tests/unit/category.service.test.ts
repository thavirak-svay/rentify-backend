import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "../../src/types/database";
import * as categoryService from "../../src/services/category.service";

describe("Category Service", () => {
  const mockCategories: Category[] = [
    { id: "cat-1", name: "Electronics", slug: "electronics", icon: "laptop", sort_order: 1, created_at: "2024-01-01T00:00:00Z" },
    { id: "cat-2", name: "Vehicles", slug: "vehicles", icon: "car", sort_order: 2, created_at: "2024-01-01T00:00:00Z" },
    { id: "cat-3", name: "Cameras", slug: "cameras", icon: "camera", sort_order: 3, created_at: "2024-01-01T00:00:00Z" },
  ];

  const createMockClient = (tableName: string, data: unknown, error: unknown = null) => {
    return {
      from: (_table: string) => {
        if (tableName === "categories") {
          return {
            select: () => ({
              order: () => Promise.resolve({ data, error }),
              eq: () => ({
                single: () => Promise.resolve({ data, error }),
              }),
            }),
          };
        }
        return { select: () => ({}) };
      },
    } as unknown as SupabaseClient;
  };

  describe("getCategories", () => {
    test("should return all categories", async () => {
      const result = await categoryService.getCategories(createMockClient("categories", mockCategories));
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Electronics");
    });

    test("should return empty array when no categories", async () => {
      const result = await categoryService.getCategories(createMockClient("categories", []));
      expect(result).toHaveLength(0);
    });

    test("should throw error when fetch fails", async () => {
      await expect(
        categoryService.getCategories(createMockClient("categories", null, { message: "DB error" }))
      ).rejects.toThrow("Failed to get categories: DB error");
    });
  });

  describe("getCategory", () => {
    test("should return category by slug", async () => {
      const result = await categoryService.getCategory(
        createMockClient("categories", mockCategories[0]),
        "electronics"
      );
      expect(result.name).toBe("Electronics");
    });

    test("should throw error when category not found", async () => {
      await expect(
        categoryService.getCategory(createMockClient("categories", null, { message: "Not found" }), "nonexistent")
      ).rejects.toThrow("Category not found");
    });
  });
});
