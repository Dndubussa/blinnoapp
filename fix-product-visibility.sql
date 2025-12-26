-- Fix Product Visibility Issues
-- Run this after checking diagnose-visibility.sql results
-- This ensures all products are visible to public users

BEGIN;

-- Step 1: Activate all products (set is_active to true)
-- This is the most common issue - products created but not activated
UPDATE products
SET 
  is_active = true,
  updated_at = NOW()
WHERE 
  is_active = false 
  OR is_active IS NULL;

-- Step 2: Ensure all products have valid required fields
-- Products without these might cause frontend issues
UPDATE products
SET 
  title = COALESCE(title, 'Untitled Product'),
  category = COALESCE(category, 'Other'),
  currency = COALESCE(currency, 'TZS'),
  updated_at = NOW()
WHERE 
  title IS NULL 
  OR title = ''
  OR category IS NULL 
  OR category = ''
  OR currency IS NULL
  OR currency = '';

-- Step 3: Fix any zero or NULL prices that would cause display issues
UPDATE products
SET 
  price = CASE 
    WHEN category = 'Books' THEN 1000.00
    WHEN category = 'Music' THEN 1500.00
    WHEN category = 'Courses' THEN 5000.00
    ELSE 5000.00
  END,
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  price IS NULL 
  OR price <= 0;

-- Step 4: Verify RLS policies allow public read access
-- Check if products table has proper SELECT policy for anon users
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Check if public read policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname LIKE '%public%'
    AND cmd = 'SELECT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE WARNING '⚠️  No public SELECT policy found for products table!';
    RAISE WARNING '   You may need to add RLS policy for anonymous users.';
    RAISE WARNING '   See Step 5 below for the policy to add.';
  ELSE
    RAISE NOTICE '✅ Public SELECT policy exists for products table.';
  END IF;
END $$;

-- Log the results
DO $$
DECLARE
  total_products INT;
  active_products INT;
  visible_products INT;
BEGIN
  -- Count all products
  SELECT COUNT(*) INTO total_products FROM products;
  
  -- Count active products
  SELECT COUNT(*) INTO active_products FROM products WHERE is_active = true;
  
  -- Count products that should be visible (active with valid data)
  SELECT COUNT(*) INTO visible_products 
  FROM products 
  WHERE is_active = true 
    AND price > 0 
    AND title IS NOT NULL 
    AND title != '';
  
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║   PRODUCT VISIBILITY FIX SUMMARY          ║';
  RAISE NOTICE '╠════════════════════════════════════════════╣';
  RAISE NOTICE '║ Total products:           % ', LPAD(total_products::TEXT, 15);
  RAISE NOTICE '║ Active products:          % ', LPAD(active_products::TEXT, 15);
  RAISE NOTICE '║ Visible products:         % ', LPAD(visible_products::TEXT, 15);
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  
  IF visible_products = 0 THEN
    RAISE WARNING '⚠️  No visible products! Check RLS policies in Step 5.';
  ELSIF visible_products = total_products THEN
    RAISE NOTICE '✅ All products are now visible!';
  ELSE
    RAISE NOTICE '✅ Product visibility fixed! Refresh your browser.';
  END IF;
END $$;

-- Verify the fix
SELECT 
  '📊 Verification' as status,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE is_active = true AND price > 0) as should_be_visible
FROM products;

COMMIT;

-- ============================================================
-- Step 5: If products still don't show, add this RLS policy
-- Run this SEPARATELY in SQL Editor if needed:
-- ============================================================

/*
-- Enable RLS on products table (if not already enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;

-- Create new public read policy
CREATE POLICY "Public products are viewable by everyone"
  ON products
  FOR SELECT
  TO public
  USING (is_active = true);

-- Verify policy was created
SELECT 
  policyname, 
  cmd, 
  roles, 
  qual 
FROM pg_policies 
WHERE tablename = 'products';
*/
