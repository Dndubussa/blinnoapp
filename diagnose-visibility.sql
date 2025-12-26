-- Diagnostic: Why aren't products showing on public pages?
-- Run this step-by-step in Supabase SQL Editor

-- Step 1: Check if products exist and their status
SELECT 
  '📊 Product Status Summary' as check_type,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE is_active = true) as active_products,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_products,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_status
FROM products;

-- Step 2: Show sample products with full details
SELECT 
  id,
  title,
  category,
  price,
  currency,
  is_active,
  seller_id,
  created_at,
  CASE 
    WHEN is_active = true THEN '✅ Should be visible'
    WHEN is_active = false THEN '❌ Hidden (inactive)'
    WHEN is_active IS NULL THEN '⚠️ NULL status (problem!)'
  END as visibility_status
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check RLS (Row Level Security) policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

-- Step 4: Test query as anonymous user (what public sees)
-- This simulates what happens when not logged in
SELECT 
  id,
  title,
  price,
  currency,
  category,
  is_active
FROM products
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- Step 5: Count by category
SELECT 
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM products
GROUP BY category
ORDER BY category;
