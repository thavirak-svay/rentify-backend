import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "../types/database";

export async function getCategories(supabaseAdmin: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select()
    .order("sort_order");

  if (error) {
    throw new Error(`Failed to get categories: ${error.message}`);
  }

  return data || [];
}

export async function getCategory(supabaseAdmin: SupabaseClient, slug: string): Promise<Category> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select()
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error("Category not found");
  }

  return data;
}
