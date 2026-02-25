import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "../lib/errors";
import type { Profile } from "../types/database";
import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  address_city: z.string().max(100).optional(),
  address_country: z.string().length(2).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account_masked: z.string().max(20).optional(),
  payway_beneficiary_id: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function getProfile(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<Profile> {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select()
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new NotFoundError("Profile not found");
  }

  return profile;
}

export async function getPublicProfile(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<Partial<Profile>> {
  const profile = await getProfile(supabaseAdmin, userId);

  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    rating_avg: profile.rating_avg,
    rating_count: profile.rating_count,
    completed_rentals: profile.completed_rentals,
    identity_status: profile.identity_status,
    created_at: profile.created_at,
  };
}

export async function updateProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function updateLastActive(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  await supabaseAdmin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);
}
