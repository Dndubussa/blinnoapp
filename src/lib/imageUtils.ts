/**
 * Image utility functions for handling product images, cover images, and thumbnails
 * Provides consistent image URL normalization, fallback handling, and caching
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Converts old product-files URLs to signed URLs for private bucket access
 * Returns the original URL if it's already from product-images or if signed URL creation fails
 */
async function migratePrivateBucketUrl(url: string): Promise<string> {
  // Check if URL is from private product-files bucket
  if (!url.includes('/product-files/')) {
    return url; // Already from public bucket or external URL
  }

  try {
    // Extract path after 'product-files/'
    const match = url.match(/\/product-files\/(.+)$/);
    if (!match || !match[1]) {
      console.warn('Could not extract path from product-files URL:', url);
      return url;
    }

    const path = match[1];
    
    // Create signed URL (valid for 1 year)
    const { data, error } = await supabase.storage
      .from('product-files')
      .createSignedUrl(path, 31536000); // 1 year in seconds

    if (error) {
      console.error('Error creating signed URL for:', path, error);
      return url; // Return original URL as fallback
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error migrating URL:', error);
    return url; // Return original URL as fallback
  }
}

/**
 * Normalizes image URLs from Supabase storage
 * Handles both product-images and product-files buckets
 * Automatically converts private bucket URLs to signed URLs
 */
export async function normalizeImageUrl(url: string | null | undefined): Promise<string> {
  if (!url) return "/placeholder.svg";
  
  // If already a full URL, check if it needs migration from private bucket
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Migrate URLs from private product-files bucket to signed URLs
    if (url.includes('/product-files/')) {
      return await migratePrivateBucketUrl(url);
    }
    return url;
  }
  
  // If it's a relative path, assume it's from Supabase storage
  // Return as is (Supabase URLs should already be full URLs)
  return url;
}

/**
 * Synchronous version of normalizeImageUrl for cases where async is not possible
 * Note: This will NOT convert private bucket URLs - use normalizeImageUrl for that
 */
export function normalizeImageUrlSync(url: string | null | undefined): string {
  if (!url) return "/placeholder.svg";
  
  console.log('normalizeImageUrlSync input:', url);
  
  // If already a full URL, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Warn about private bucket URLs that need migration
    if (url.includes('/product-files/')) {
      console.warn('⚠️ Image URL points to private product-files bucket. This will likely fail to load:', url);
      console.warn('Solution: Images should be in public product-images bucket');
    }
    console.log('normalizeImageUrlSync output (full URL):', url);
    return url;
  }
  
  // If it's a relative path, return as is
  console.log('normalizeImageUrlSync output (relative):', url);
  return url;
}

/**
 * Gets the first available image from an array of images
 * Falls back to placeholder if no images available
 */
export async function getPrimaryImage(images: string[] | null | undefined): Promise<string> {
  if (!images || images.length === 0) {
    return "/placeholder.svg";
  }
  
  // Filter out invalid/empty images
  const validImages = images.filter(img => img && img.trim().length > 0);
  
  if (validImages.length === 0) {
    return "/placeholder.svg";
  }
  
  return await normalizeImageUrl(validImages[0]);
}

/**
 * Synchronous version - use for initial renders, then load async version
 */
export function getPrimaryImageSync(images: string[] | null | undefined): string {
  if (!images || images.length === 0) {
    return "/placeholder.svg";
  }
  
  const validImages = images.filter(img => img && img.trim().length > 0);
  
  if (validImages.length === 0) {
    return "/placeholder.svg";
  }
  
  return normalizeImageUrlSync(validImages[0]);
}

/**
 * Gets all valid images from an array, with fallback
 */
export async function getValidImages(images: string[] | null | undefined): Promise<string[]> {
  if (!images || images.length === 0) {
    return ["/placeholder.svg"];
  }
  
  const validImages = await Promise.all(
    images
      .filter(img => img && img.trim().length > 0)
      .map(img => normalizeImageUrl(img))
  );
  
  return validImages.length > 0 ? validImages : ["/placeholder.svg"];
}

/**
 * Synchronous version - use for initial renders
 */
export function getValidImagesSync(images: string[] | null | undefined): string[] {
  if (!images || images.length === 0) {
    return ["/placeholder.svg"];
  }
  
  const validImages = images
    .filter(img => img && img.trim().length > 0)
    .map(img => normalizeImageUrlSync(img));
  
  return validImages.length > 0 ? validImages : ["/placeholder.svg"];
}

/**
 * Checks if an image URL is valid (not placeholder)
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url !== "/placeholder.svg" && url.trim().length > 0;
}

/**
 * Gets product image from product data
 * Handles both regular images and category-specific cover images
 */
export async function getProductImage(product: {
  images?: string[] | null;
  category?: string;
  attributes?: Record<string, any> | null;
}): Promise<string> {
  // For Music category, check for albumCover
  if (product.category === "Music" && product.attributes?.albumCover) {
    return await normalizeImageUrl(product.attributes.albumCover);
  }
  
  // For Books category, check for coverImage
  if (product.category === "Books" && product.attributes?.coverImage) {
    return await normalizeImageUrl(product.attributes.coverImage);
  }
  
  // For Courses category, check for thumbnail
  if (product.category === "Courses" && product.attributes?.thumbnail) {
    return await normalizeImageUrl(product.attributes.thumbnail);
  }
  
  // Fall back to regular images array
  return await getPrimaryImage(product.images);
}

/**
 * Synchronous version - use for initial renders
 */
export function getProductImageSync(product: {
  images?: string[] | null;
  category?: string;
  attributes?: Record<string, any> | null;
}): string {
  console.log('getProductImageSync called for:', {
    category: product.category,
    hasAttributes: !!product.attributes,
    coverImage: product.attributes?.coverImage,
    albumCover: product.attributes?.albumCover,
    thumbnail: product.attributes?.thumbnail,
    imagesArray: product.images
  });
  
  // For Music category, check for albumCover
  if (product.category === "Music" && product.attributes?.albumCover) {
    console.log('Using Music albumCover:', product.attributes.albumCover);
    return normalizeImageUrlSync(product.attributes.albumCover);
  }
  
  // For Books category, check for coverImage
  if (product.category === "Books" && product.attributes?.coverImage) {
    console.log('Using Books coverImage:', product.attributes.coverImage);
    return normalizeImageUrlSync(product.attributes.coverImage);
  }
  
  // For Courses category, check for thumbnail
  if (product.category === "Courses" && product.attributes?.thumbnail) {
    console.log('Using Courses thumbnail:', product.attributes.thumbnail);
    return normalizeImageUrlSync(product.attributes.thumbnail);
  }
  
  // Fall back to regular images array
  console.log('Falling back to images array');
  return getPrimaryImageSync(product.images);
}

/**
 * Gets all product images including category-specific covers
 */
export async function getAllProductImages(product: {
  images?: string[] | null;
  category?: string;
  attributes?: Record<string, any> | null;
}): Promise<string[]> {
  const images: string[] = [];
  
  // Add category-specific cover first if available
  if (product.category === "Music" && product.attributes?.albumCover) {
    images.push(await normalizeImageUrl(product.attributes.albumCover));
  } else if (product.category === "Books" && product.attributes?.coverImage) {
    images.push(await normalizeImageUrl(product.attributes.coverImage));
  } else if (product.category === "Courses" && product.attributes?.thumbnail) {
    images.push(await normalizeImageUrl(product.attributes.thumbnail));
  }
  
  // Add regular images
  const regularImages = await getValidImages(product.images);
  regularImages.forEach(img => {
    if (img !== "/placeholder.svg" && !images.includes(img)) {
      images.push(img);
    }
  });
  
  // Ensure at least one image (placeholder if needed)
  return images.length > 0 ? images : ["/placeholder.svg"];
}

/**
 * Synchronous version - use for initial renders
 */
export function getAllProductImagesSync(product: {
  images?: string[] | null;
  category?: string;
  attributes?: Record<string, any> | null;
}): string[] {
  const images: string[] = [];
  
  // Add category-specific cover first if available
  if (product.category === "Music" && product.attributes?.albumCover) {
    images.push(normalizeImageUrlSync(product.attributes.albumCover));
  } else if (product.category === "Books" && product.attributes?.coverImage) {
    images.push(normalizeImageUrlSync(product.attributes.coverImage));
  } else if (product.category === "Courses" && product.attributes?.thumbnail) {
    images.push(normalizeImageUrlSync(product.attributes.thumbnail));
  }
  
  // Add regular images
  const regularImages = getValidImagesSync(product.images);
  regularImages.forEach(img => {
    if (img !== "/placeholder.svg" && !images.includes(img)) {
      images.push(img);
    }
  });
  
  // Ensure at least one image (placeholder if needed)
  return images.length > 0 ? images : ["/placeholder.svg"];
}

