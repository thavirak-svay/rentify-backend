import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError, ForbiddenError, NotFoundError } from "../lib/errors";
import type { CreateListingInput, UpdateListingInput } from "../lib/validators";
import type { Listing, ListingMedia } from "../types/database";

export async function createListing(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateListingInput
): Promise<Listing> {
  const location = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : null;

  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description,
      category_id: input.category_id,
      type: input.type,
      price_hourly: input.price_hourly,
      price_daily: input.price_daily,
      price_weekly: input.price_weekly,
      deposit_amount: input.deposit_amount,
      currency: input.currency,
      address_text: input.address_text,
      address_city: input.address_city,
      address_country: input.address_country,
      location,
      availability_type: input.availability_type,
      min_rental_hours: input.min_rental_hours,
      max_rental_days: input.max_rental_days,
      delivery_available: input.delivery_available,
      delivery_fee: input.delivery_fee,
      pickup_available: input.pickup_available,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to create listing: ${error.message}`);

  return data;
}

export async function getListing(supabase: SupabaseClient, id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) throw new NotFoundError("Listing not found");
  return data;
}

export async function getListingWithMedia(
  supabase: SupabaseClient,
  id: string
): Promise<{ listing: Listing; media: ListingMedia[] }> {
  const listing = await getListing(supabase, id);
  const { data: media } = await supabase
    .from("listing_media")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order");

  return { listing, media: media || [] };
}

export async function updateListing(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  input: UpdateListingInput
): Promise<Listing> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId)
    throw new ForbiddenError("You can only update your own listings");

  const location = input.location
    ? `POINT(${input.location.lng} ${input.location.lat})`
    : undefined;
  const updateData: Record<string, unknown> = { ...input };
  if (location) updateData.location = location;

  const { data, error } = await supabase
    .from("listings")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to update listing: ${error.message}`);
  return data;
}

export async function deleteListing(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId)
    throw new ForbiddenError("You can only delete your own listings");

  const { error } = await supabase
    .from("listings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new DatabaseError(`Failed to delete listing: ${error.message}`);
}

export async function publishListing(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<Listing> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId)
    throw new ForbiddenError("You can only publish your own listings");
  if (listing.status !== "draft") throw new Error("Only draft listings can be published");

  const { data, error } = await supabase
    .from("listings")
    .update({ status: "active", published_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to publish listing: ${error.message}`);
  return data;
}

export async function getUserListings(
  supabase: SupabaseClient,
  userId: string,
  status?: string
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new DatabaseError(`Failed to get listings: ${error.message}`);
  return data || [];
}
