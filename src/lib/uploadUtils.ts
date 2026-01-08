/**
 * Upload utilities with progress tracking
 * Uses XMLHttpRequest for progress tracking since Supabase Storage doesn't support progress callbacks
 */

import { supabase } from "@/integrations/supabase/client";

export interface UploadProgress {
  progress: number; // 0-100
  loaded: number; // bytes loaded
  total: number; // total bytes
}

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  cacheControl?: string;
  upsert?: boolean;
}

/**
 * Upload file to Supabase Storage with progress tracking
 */
export async function uploadFileWithProgress(
  options: UploadOptions
): Promise<{ data: { path: string } | null; error: any }> {
  const { bucket, path, file, onProgress, cacheControl, upsert } = options;

  return new Promise((resolve) => {
    // Get the Supabase storage URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      resolve({ data: null, error: { message: "Supabase configuration missing" } });
      return;
    }
    
    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    // Get the session token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        resolve({ data: null, error: { message: "Not authenticated" } });
        return;
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress({
            progress,
            loaded: e.loaded,
            total: e.total,
          });
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: { path }, error: null });
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            resolve({ data: null, error });
          } catch {
            resolve({
              data: null,
              error: { message: `Upload failed with status ${xhr.status}` },
            });
          }
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        resolve({
          data: null,
          error: { message: "Network error during upload" },
        });
      });

      // Open and send request
      xhr.open("POST", storageUrl, true);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", supabaseKey);
      xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");
      if (cacheControl) {
        xhr.setRequestHeader("cache-control", cacheControl);
      }

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });
  });
}

/**
 * Get public URL for uploaded file
 * For private buckets, this will return a URL that won't work - use getSignedUrl instead
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get signed URL for private bucket files (valid for 1 year)
 * Use this for product-files bucket which is private
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 31536000): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

/**
 * Get appropriate URL for a file based on bucket type
 * - Public buckets (product-images, product-files, product-previews): returns public URL
 * - Private buckets: returns signed URL
 */
export async function getFileUrl(bucket: string, path: string): Promise<string> {
  // All product-related buckets are now public
  if (bucket === 'product-images' || bucket === 'product-files' || bucket === 'product-previews') {
    return getPublicUrl(bucket, path);
  }
  
  // Private buckets need signed URLs
  const signedUrl = await getSignedUrl(bucket, path);
  return signedUrl || getPublicUrl(bucket, path); // Fallback to public URL if signed URL fails
}

