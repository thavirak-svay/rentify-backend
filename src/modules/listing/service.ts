import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOKING_STATUS } from '@/constants/booking';
import { LISTING_STATUS } from '@/constants/listing';
import { fetchMany, softDeleteOne, updateOne } from '@/shared/lib/db-helpers';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { timestamp } from '@/shared/lib/timestamp';
import { requireOwnership } from '@/shared/lib/guards';
import type { CreateListingInput, UpdateListingInput } from './validation';
import type { Listing, ListingMedia } from '@/generated/database';

function validateCoordinates(lat: number | undefined, lng: number | undefined): void {
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

export async function createListing(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateListingInput,
): Promise<Listing> {
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

  if (error) throw new NotFoundError(`Failed to create listing: ${error.message}`);

  return data;
}

export async function getListing(supabase: SupabaseClient, id: string): Promise<Listing> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).is('deleted_at', null).single();

  if (error || !data) throw new NotFoundError('Listing not found');
  return data;
}

export async function getListingWithMedia(
  supabase: SupabaseClient,
  id: string,
): Promise<{ listing: Listing; media: ListingMedia[] }> {
  const listing = await getListing(supabase, id);
  const media = await fetchMany<ListingMedia>(supabase, 'listing_media', {
    column: 'listing_id',
    value: id,
    orderBy: { column: 'sort_order' },
  });

  return { listing, media };
}

export async function updateListing(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  input: UpdateListingInput,
): Promise<Listing> {
  const listing = await getListing(supabase, id);
  requireOwnership(listing, userId, 'listing');

  if (input.location) {
    validateCoordinates(input.location.lat, input.location.lng);
  }
  const location = input.location ? `POINT(${input.location.lng} ${input.location.lat})` : undefined;
  const updateData: Record<string, unknown> = { ...input };
  if (location) updateData.location = location;

  return updateOne<Listing>(supabase, 'listings', id, updateData);
}

export async function deleteListing(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const listing = await getListing(supabase, id);
  requireOwnership(listing, userId, 'listing');

  // Check for active bookings
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .in('status', [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.ACTIVE]);

  if (activeBookings && activeBookings.length > 0) {
    throw new ConflictError('Cannot delete listing with active bookings');
  }

  await softDeleteOne(supabase, 'listings', id);
}

export async function publishListing(supabase: SupabaseClient, id: string, userId: string): Promise<Listing> {
  const listing = await getListing(supabase, id);
  requireOwnership(listing, userId, 'listing');

  if (listing.status !== LISTING_STATUS.DRAFT) {
    throw new ValidationError('Only draft listings can be published');
  }

  return updateOne<Listing>(supabase, 'listings', id, { status: LISTING_STATUS.ACTIVE, published_at: timestamp.now() });
}

export async function getUserListings(
  supabase: SupabaseClient,
  userId: string,
  status?: string,
): Promise<Listing[]> {
  let query = supabase.from('listings').select('*').eq('owner_id', userId).is('deleted_at', null).order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new NotFoundError(`Failed to get listings: ${error.message}`);
  return data || [];
}