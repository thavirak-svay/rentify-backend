import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  COUNTRY_CODE_LENGTH,
  MAX_BANK_ACCOUNT_LENGTH,
  MAX_BIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from '@/constants/user';
import { fetchOne, updateOne } from '@/shared/lib/db-helpers';
import { timestamp } from '@/shared/lib/timestamp';
import type { Profile } from '@/shared/types/database';

export const updateProfileSchema = z.object({
  display_name: z.string().min(MIN_DISPLAY_NAME_LENGTH).max(MAX_DISPLAY_NAME_LENGTH).optional(),
  avatar_url: z.url().optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  address_city: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  address_country: z.string().length(COUNTRY_CODE_LENGTH).optional(),
  bank_name: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  bank_account_masked: z.string().max(MAX_BANK_ACCOUNT_LENGTH).optional(),
  payway_beneficiary_id: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  return fetchOne<Profile>(supabase, 'profiles', { id: userId }, 'Profile');
}

export async function getPublicProfile(supabase: SupabaseClient, userId: string): Promise<Partial<Profile>> {
  const profile = await getProfile(supabase, userId);

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
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  return updateOne<Profile>(supabase, 'profiles', userId, input, 'Profile');
}

export async function updateLastActive(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from('profiles').update({ last_active_at: timestamp.now() }).eq('id', userId);
}