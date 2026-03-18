import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, ForbiddenError, NotFoundError } from '../../shared/lib/errors';

/**
 * Sanitize filename to prevent path traversal and special character issues
 */
function sanitizeFileName(fileName: string): string {
  if (!fileName || fileName.trim() === '') {
    return `file_${Date.now()}`;
  }
  // Get just the filename without any path components
  const baseName = fileName.split('/').pop()?.split('\\').pop() || `file_${Date.now()}`;
  // Replace any non-alphanumeric characters (except dots and dashes) with underscores
  const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  // Ensure the filename is not empty after sanitization
  return sanitized || `file_${Date.now()}`;
}

export async function createUploadUrl(
  supabaseAdmin: SupabaseClient,
  userId: string,
  fileName: string,
  _contentType = 'image/jpeg',
): Promise<{ upload_url: string; path: string; public_url: string }> {
  const TIMESTAMP = Date.now();
  const SAFE_NAME = sanitizeFileName(fileName);
  const PATH = `uploads/${userId}/${TIMESTAMP}-${SAFE_NAME}`;

  const { data, error } = await supabaseAdmin.storage.from('listing-media').createSignedUploadUrl(PATH);

  if (error) {
    throw new DatabaseError(`Failed to create upload URL: ${error.message}`);
  }

  const PUBLIC_URL = supabaseAdmin.storage.from('listing-media').getPublicUrl(PATH).data.publicUrl;

  return {
    upload_url: data.signedUrl,
    path: PATH,
    public_url: PUBLIC_URL,
  };
}

export async function confirmUpload(
  supabaseAdmin: SupabaseClient,
  _userId: string,
  listingId: string,
  path: string,
  isPrimary = false,
): Promise<{ id: string; url: string }> {
  const PUBLIC_URL = supabaseAdmin.storage.from('listing-media').getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabaseAdmin
    .from('listing_media')
    .insert({
      listing_id: listingId,
      url: PUBLIC_URL,
      is_primary: isPrimary,
    })
    .select('id, url')
    .single();

  if (error) {
    throw new DatabaseError(`Failed to confirm upload: ${error.message}`);
  }

  return data;
}

export async function deleteMedia(supabaseAdmin: SupabaseClient, userId: string, mediaId: string): Promise<void> {
  const { data: MEDIA, error: FETCH_ERROR } = await supabaseAdmin
    .from('listing_media')
    .select('id, listing_id, url, listings(owner_id)')
    .eq('id', mediaId)
    .single();

  if (FETCH_ERROR || !MEDIA) {
    throw new NotFoundError('Media not found');
  }

  const LISTING = Array.isArray(MEDIA.listings) ? MEDIA.listings[0] : (MEDIA.listings as { owner_id: string } | null);
  if (!LISTING || LISTING.owner_id !== userId) {
    throw new ForbiddenError('You can only delete your own media');
  }

  const { error: DELETE_ERROR } = await supabaseAdmin.from('listing_media').delete().eq('id', mediaId);

  if (DELETE_ERROR) {
    throw new DatabaseError(`Failed to delete media: ${DELETE_ERROR.message}`);
  }

  // Extract path from URL for storage deletion
  const URL_PARTS = MEDIA.url.split('/listing-media/');
  if (URL_PARTS.length > 1) {
    const PATH = URL_PARTS[1].split('?')[0]; // Remove query params if any
    await supabaseAdmin.storage.from('listing-media').remove([PATH]);
  }
}
