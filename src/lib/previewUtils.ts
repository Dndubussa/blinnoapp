/**
 * Preview utility functions for handling audio/video preview URLs
 * Ensures previews are accessible to all buyers (public access)
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Get preview URL that's accessible to all buyers
 * - If URL is from product-previews (public bucket), return as-is
 * - If URL is from product-files (private bucket), create public signed URL
 * - Handles both public and private bucket URLs
 */
export async function getPreviewUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  // If URL is from public product-previews bucket, return as-is
  if (url.includes('/product-previews/')) {
    return url;
  }

  // If URL is from private product-files bucket, create signed URL for preview access
  if (url.includes('/product-files/')) {
    try {
      // Extract path from URL
      const match = url.match(/\/product-files\/(.+)$/);
      if (!match || !match[1]) {
        console.warn('Could not extract path from product-files URL:', url);
        return url; // Return original as fallback
      }

      const path = match[1];
      
      // Create signed URL valid for 1 year (previews should be long-lived)
      const { data, error } = await supabase.storage
        .from('product-files')
        .createSignedUrl(path, 31536000); // 1 year in seconds

      if (error) {
        console.error('Error creating signed URL for preview:', path, error);
        return url; // Return original URL as fallback
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting preview URL:', error);
      return url; // Return original URL as fallback
    }
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

