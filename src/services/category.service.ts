import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError, NotFoundError } from "../lib/errors";
import type { Category } from "../types/database";

export async function getCategories(supabaseAdmin: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabaseAdmin.from("categories").select().order("sort_order");

  if (error) {
    throw new DatabaseError(`Failed to get categories: ${error.message}`);
  }

  return data || [];
}

export async function getCategory(supabaseAdmin: SupabaseClient, slug: string): Promise<Category> {
  const { data, error } = await supabaseAdmin.from("categories").select().eq("slug", slug).single();

  if (error || !data) {
    throw new NotFoundError("Category not found");
  }

  return data;
}
