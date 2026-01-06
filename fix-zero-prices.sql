-- Fix Script: Restore products with zero or very small prices
-- Run this AFTER checking with check-product-prices.sql
-- 
-- Problem: Previous migration divided prices by 2500, turning small TZS prices into 0.00
-- Solution: Multiply back by 2500 to restore original TZS prices

BEGIN;

-- OPTION 1: If products were originally in TZS and got divided by 2500
-- This reverses that division
-- Example: 0.0004 * 2500 = 1.00 TZS (back to original)

UPDATE products
SET 
  price = ROUND((price * 2500.0)::numeric, 2),
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  price > 0 
  AND price < 1 
  AND (currency = 'USD' OR currency = 'TZS');

-- OPTION 2: If you want to set specific default prices for zero-price products
-- Uncomment and modify this section:

/*
UPDATE products
SET 
  price = CASE 
    WHEN category = 'Books' THEN 1000.00
    WHEN category = 'Music' THEN 1500.00
    WHEN category = 'Courses' THEN 5000.00
    ELSE 1000.00
  END,
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  price = 0 
  OR price IS NULL;
*/

-- Log results
DO $$
DECLARE
  updated_count INT;
  zero_count INT;
BEGIN
  -- Count updated products
  SELECT COUNT(*) INTO updated_count 
  FROM products 
  WHERE updated_at >= NOW() - INTERVAL '1 minute';
  
  -- Count remaining zero-price products
  SELECT COUNT(*) INTO zero_count 
  FROM products 
  WHERE price < 0.01;
  
  RAISE NOTICE '✅ Price restoration completed';
  RAISE NOTICE '   Updated products: %', updated_count;
  RAISE NOTICE '   Remaining zero-price products: %', zero_count;
  
  IF zero_count > 0 THEN
    RAISE WARNING '⚠️  Some products still have zero/small prices. Check manually or use OPTION 2.';
  END IF;
END $$;

-- Verify results
SELECT 
  'After Fix' as status,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE price < 0.01) as zero_price_count,
  COUNT(*) FILTER (WHERE price >= 0.01 AND price < 1) as under_1,
  COUNT(*) FILTER (WHERE price >= 1 AND price < 10) as range_1_10,
  COUNT(*) FILTER (WHERE price >= 10) as over_10
FROM products;

COMMIT;
