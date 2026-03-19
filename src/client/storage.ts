/**
 * Storage Client
 * Encapsulates all Supabase storage operations
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExternalServiceError } from '@/shared/lib/errors';

// ============================================================================
// Types
// ============================================================================

export interface UploadUrlResult {
  upload_url: string;
  path: string;
  public_url: string;
}

export interface UploadResult {
  id: string;
  url: string;
}

// ============================================================================
// Storage Client
// ============================================================================

const BUCKET_NAME = 'listing-media';

export class StorageClient {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Create a signed upload URL for a file
   */
  async createUploadUrl(path: string): Promise<UploadUrlResult> {
    const { data, error } = await this.supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(path);

    if (error) {
      throw new ExternalServiceError('Storage', `Failed to create upload URL: ${error.message}`);
    }

    const publicUrl = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;

    return {
      upload_url: data.signedUrl,
      path: path,
      public_url: publicUrl,
    };
  }

  /**
   * Get public URL for a path
   */
  getPublicUrl(path: string): string {
    return this.supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Delete files from storage
   */
  async deleteFiles(paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET_NAME).remove(paths);

    if (error) {
      throw new ExternalServiceError('Storage', `Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Extract storage path from public URL
   */
  static extractPathFromUrl(url: string): string | null {
    const urlParts = url.split('/listing-media/');
    if (urlParts.length > 1 && urlParts[1]) {
      return urlParts[1].split('?')[0] ?? null; // Remove query params if any
    }
    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStorageClient(supabase: SupabaseClient): StorageClient {
  return new StorageClient(supabase);
}