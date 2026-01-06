/**
 * Preview utility functions for handling audio/video preview URLs
 * Ensures previews are accessible to all buyers (public access)
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Get preview URL that's accessible to all buyers
 * - product-files bucket is now public, so return public URLs directly
 * - product-previews bucket is public, return as-is
 * - Handles both public bucket URLs
 */
export async function getPreviewUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  // All product buckets are now public, return URLs as-is
  if (url.includes('/product-previews/') || url.includes('/product-files/')) {
    return url;
  }

  // External URL or already public, return as-is
  return url;
}

/**
 * Synchronous version - returns URL as-is (for initial render)
 * Use getPreviewUrl() for actual access to ensure signed URLs are created
 */
export function getPreviewUrlSync(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Return as-is for initial render
  // The async version will handle signed URL creation when needed
  return url;
}

/**
 * Check if a URL is from a private bucket that needs signed URL
 */
export function isPrivateBucketUrl(url: string): boolean {
  return url.includes('/product-files/') && !url.includes('/product-previews/');
}

