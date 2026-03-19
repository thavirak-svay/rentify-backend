import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOKING_STATUS, LISTING_STATUS } from '@/constants';
import { ConflictError, DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import type { CreateListingInput, UpdateListingInput } from '@/shared/lib/validation';
import type { Listing, ListingMedia } from '@/shared/types/database';

function validateCoordinates(lat: number | undefined, lng: number | undefined): void {
  // Both lat and lng must be provided together, or neither
  const hasLat = lat !== undefined;
  const hasLng = lng !== undefined;

  if (hasLat !== hasLng) {
    throw new ValidationError('Both latitude and longitude must be provided together');
  }

  if (hasLat && hasLng) {
    if (lat < -90 || lat > 90) {
      throw new ValidationError('Latitude must be between -90 and 90');
    }
    if (lng < -180 || lng > 180) {
      throw new ValidationError('Longitude must be between -180 and 180');
    }
  }
}

export async function createListing(supabase: SupabaseClient, ownerId: string, input: CreateListingInput): Promise<Listing> {
  if (input.location) {
    validateCoordinates(input.location.lat, input.location.lng);
  }
  const location = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : null;

  const { data, error } = await supabase
    .from('listings')
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
      location: location,
      availability_type: input.availability_type,
      min_rental_hours: input.min_rental_hours,
      max_rental_days: input.max_rental_days,
      delivery_available: input.delivery_available,
      delivery_fee: input.delivery_fee,
      pickup_available: input.pickup_available,
      status: LISTING_STATUS.DRAFT,
    })
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to create listing: ${error.message}`);

  return data;
}

export async function getListing(supabase: SupabaseClient, id: string): Promise<Listing> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).is('deleted_at', null).single();

  if (error || !data) throw new NotFoundError('Listing not found');
  return data;
}

export async function getListingWithMedia(supabase: SupabaseClient, id: string): Promise<{ listing: Listing; media: ListingMedia[] }> {
  const listing = await getListing(supabase, id);
  const { data: media } = await supabase.from('listing_media').select('*').eq('listing_id', id).order('sort_order');

  return { listing: listing, media: media || [] };
}

export async function updateListing(supabase: SupabaseClient, id: string, userId: string, input: UpdateListingInput): Promise<Listing> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId) throw new ForbiddenError('You can only update your own listings');

  if (input.location) {
    validateCoordinates(input.location.lat, input.location.lng);
  }
  const location = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : undefined;
  const updateData: Record<string, unknown> = { ...input };
  if (location) updateData.location = location;

  const { data, error } = await supabase.from('listings').update(updateData).eq('id', id).select().single();

  if (error) throw new DatabaseError(`Failed to update listing: ${error.message}`);
  return data;
}

export async function deleteListing(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId) throw new ForbiddenError('You can only delete your own listings');

  // Check for active bookings
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .in('status', [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.ACTIVE]);

  if (activeBookings && activeBookings.length > 0) {
    throw new ConflictError('Cannot delete listing with active bookings');
  }

  const { error } = await supabase.from('listings').update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) throw new DatabaseError(`Failed to delete listing: ${error.message}`);
}

export async function publishListing(supabase: SupabaseClient, id: string, userId: string): Promise<Listing> {
  const listing = await getListing(supabase, id);
  if (listing.owner_id !== userId) throw new ForbiddenError('You can only publish your own listings');
  if (listing.status !== LISTING_STATUS.DRAFT) throw new ValidationError('Only draft listings can be published');

  const { data, error } = await supabase
    .from('listings')
    .update({ status: LISTING_STATUS.ACTIVE, published_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to publish listing: ${error.message}`);
  return data;
}

export async function getUserListings(supabase: SupabaseClient, userId: string, status?: string): Promise<Listing[]> {
  let query = supabase.from('listings').select('*').eq('owner_id', userId).is('deleted_at', null).order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new DatabaseError(`Failed to get listings: ${error.message}`);
  return data || [];
}
