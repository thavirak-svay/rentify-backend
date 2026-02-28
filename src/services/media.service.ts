import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError, ForbiddenError, NotFoundError } from "../lib/errors";

export async function createUploadUrl(
  supabaseAdmin: SupabaseClient,
  userId: string,
  fileName: string,
  _contentType: string = "image/jpeg"
): Promise<{ upload_url: string; path: string; public_url: string }> {
  const timestamp = Date.now();
  const path = `uploads/${userId}/${timestamp}-${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from("listing-media")
    .createSignedUploadUrl(path);

  if (error) {
    throw new DatabaseError(`Failed to create upload URL: ${error.message}`);
  }

  const publicUrl = supabaseAdmin.storage.from("listing-media").getPublicUrl(path).data.publicUrl;

  return {
    upload_url: data.signedUrl,
    path,
    public_url: publicUrl,
  };
}

export async function confirmUpload(
  supabaseAdmin: SupabaseClient,
  _userId: string,
  listingId: string,
  path: string,
  isPrimary: boolean = false
): Promise<{ id: string; url: string }> {
  const publicUrl = supabaseAdmin.storage.from("listing-media").getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabaseAdmin
    .from("listing_media")
    .insert({
      listing_id: listingId,
      url: publicUrl,
      is_primary: isPrimary,
    })
    .select("id, url")
    .single();

  if (error) {
    throw new DatabaseError(`Failed to confirm upload: ${error.message}`);
  }

  return data;
}

export async function deleteMedia(
  supabaseAdmin: SupabaseClient,
  userId: string,
  mediaId: string
): Promise<void> {
  const { data: media, error: fetchError } = await supabaseAdmin
    .from("listing_media")
    .select("id, listing_id, url, listings(owner_id)")
    .eq("id", mediaId)
    .single();

  if (fetchError || !media) {
    throw new NotFoundError("Media not found");
  }

  const listing = Array.isArray(media.listings)
    ? media.listings[0]
    : (media.listings as { owner_id: string } | null);
  if (!listing || listing.owner_id !== userId) {
    throw new ForbiddenError("You can only delete your own media");
  }

  const { error: deleteError } = await supabaseAdmin
    .from("listing_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    throw new DatabaseError(`Failed to delete media: ${deleteError.message}`);
  }

  const path = media.url.split("/listing-media/")[1];
  if (path) {
    await supabaseAdmin.storage.from("listing-media").remove([path]);
  }
}
