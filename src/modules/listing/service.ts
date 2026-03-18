import type { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/lib/errors';
import type { CreateListingInput, UpdateListingInput } from '../../shared/lib/validation';
import type { Listing, ListingMedia } from '../../shared/types/database';

function validateCoordinates(lat: number | undefined, lng: number | undefined): void {
  // Both lat and lng must be provided together, or neither
  const HAS_LAT = lat !== undefined;
  const HAS_LNG = lng !== undefined;

  if (HAS_LAT !== HAS_LNG) {
    throw new ValidationError('Both latitude and longitude must be provided together');
  }

  if (HAS_LAT && HAS_LNG) {
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
  const LOCATION = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : null;

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
      location: LOCATION,
      availability_type: input.availability_type,
      min_rental_hours: input.min_rental_hours,
      max_rental_days: input.max_rental_days,
      delivery_available: input.delivery_available,
      delivery_fee: input.delivery_fee,
      pickup_available: input.pickup_available,
      status: 'draft',
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
  const LISTING = await getListing(supabase, id);
  const { data: MEDIA } = await supabase.from('listing_media').select('*').eq('listing_id', id).order('sort_order');

  return { listing: LISTING, media: MEDIA || [] };
}

export async function updateListing(supabase: SupabaseClient, id: string, userId: string, input: UpdateListingInput): Promise<Listing> {
  const LISTING = await getListing(supabase, id);
  if (LISTING.owner_id !== userId) throw new ForbiddenError('You can only update your own listings');

  if (input.location) {
    validateCoordinates(input.location.lat, input.location.lng);
  }
  const LOCATION = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : undefined;
  const UPDATE_DATA: Record<string, unknown> = { ...input };
  if (LOCATION) UPDATE_DATA.location = LOCATION;

  const { data, error } = await supabase.from('listings').update(UPDATE_DATA).eq('id', id).select().single();

  if (error) throw new DatabaseError(`Failed to update listing: ${error.message}`);
  return data;
}

export async function deleteListing(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const LISTING = await getListing(supabase, id);
  if (LISTING.owner_id !== userId) throw new ForbiddenError('You can only delete your own listings');

  // Check for active bookings
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .in('status', ['requested', 'approved', 'active']);

  if (activeBookings && activeBookings.length > 0) {
    throw new ConflictError('Cannot delete listing with active bookings');
  }

  const { error } = await supabase.from('listings').update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) throw new DatabaseError(`Failed to delete listing: ${error.message}`);
}

export async function publishListing(supabase: SupabaseClient, id: string, userId: string): Promise<Listing> {
  const LISTING = await getListing(supabase, id);
  if (LISTING.owner_id !== userId) throw new ForbiddenError('You can only publish your own listings');
  if (LISTING.status !== 'draft') throw new ValidationError('Only draft listings can be published');

  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'active', published_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new DatabaseError(`Failed to publish listing: ${error.message}`);
  return data;
}

export async function getUserListings(supabase: SupabaseClient, userId: string, status?: string): Promise<Listing[]> {
  let QUERY = supabase.from('listings').select('*').eq('owner_id', userId).is('deleted_at', null).order('created_at', { ascending: false });

  if (status) QUERY = QUERY.eq('status', status);
  const { data, error } = await QUERY;
  if (error) throw new DatabaseError(`Failed to get listings: ${error.message}`);
  return data || [];
}
