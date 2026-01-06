-- Diagnostic SQL: Check current product prices and currencies (SIMPLIFIED)
-- Run this in Supabase SQL Editor to see what needs fixing

-- Step 1: Count products by price range (using subquery for clarity)
WITH price_categories AS (
  SELECT 
    id,
    title,
    price,
    currency,
    category,
    CASE 
      WHEN price = 0 OR price IS NULL THEN '1. Zero/NULL price ⚠️'
      WHEN price < 0.01 THEN '2. < 0.01 (Too small) ⚠️'
      WHEN price < 1 THEN '3. 0.01 - 0.99 (Under $1)'
      WHEN price < 10 THEN '4. 1.00 - 9.99'
      WHEN price < 100 THEN '5. 10.00 - 99.99'
      WHEN price < 1000 THEN '6. 100 - 999'
      ELSE '7. 1000+'
    END as price_range
  FROM products
)
SELECT 
  price_range,
  currency,
  COUNT(*) as product_count,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM price_categories
GROUP BY price_range, currency
ORDER BY price_range, currency;

-- Step 2: Show sample products with prices
SELECT 
  id,
  title,
  price,
  currency,
  category,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Find products with zero or very small prices
SELECT 
  id,
  title,
  price,
  currency,
  category,
  '⚠️ Needs attention' as status
FROM products
WHERE price < 0.01
ORDER BY price ASC, created_at DESC;
