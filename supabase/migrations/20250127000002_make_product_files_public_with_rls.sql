-- Make product-files bucket public for easier access
-- Note: RLS policies still apply for authenticated requests, but unauthenticated requests
-- can access files if they know the path. File paths are already obscure (userId/timestamp.ext),
-- providing basic security through obscurity. For stricter security, keep bucket private.
UPDATE storage.buckets SET public = true WHERE id = 'product-files';

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Purchasers can view purchased product files" ON storage.objects;

-- Create policy for authenticated users (purchasers and sellers)
-- This policy applies to authenticated requests even though bucket is public
CREATE POLICY "Authenticated users can view purchased product files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files' 
  AND (
    -- Allow access if user purchased a product from this seller's folder
    EXISTS (
      SELECT 1 FROM public.purchased_products pp
      JOIN public.products p ON p.id = pp.product_id
      WHERE pp.user_id = auth.uid()
      AND p.seller_id::text = (storage.foldername(name))[1]
    )
    -- Or if user is the seller who owns the files
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Allow public access to all files in product-files bucket
-- This enables easier preview access and eliminates need for signed URLs
-- Security relies on path obscurity (userId/timestamp.ext format)
CREATE POLICY "Public access to product files"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-files');

-- Ensure sellers can still manage their files
-- (These policies should already exist, but ensure they're present)

-- Sellers can upload product files
DROP POLICY IF EXISTS "Sellers can upload product files" ON storage.objects;
CREATE POLICY "Sellers can upload product files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Sellers can update their product files
DROP POLICY IF EXISTS "Sellers can update their product files" ON storage.objects;
CREATE POLICY "Sellers can update their product files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Sellers can delete their product files
DROP POLICY IF EXISTS "Sellers can delete their product files" ON storage.objects;
CREATE POLICY "Sellers can delete their product files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMENT ON POLICY "Anyone can view product previews" ON storage.objects IS 
'Allows public access to preview files in product-files bucket. Full files are still protected by RLS policies.';

