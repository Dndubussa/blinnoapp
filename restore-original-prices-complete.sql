-- Complete Price Restoration Script
-- Use this if you need to restore ALL products to reasonable TZS prices
-- This is a comprehensive fix that handles all edge cases

BEGIN;

-- Step 1: Fix products that were divided (price between 0.0001 and 1)
-- These were likely TZS prices divided by 2500
-- Example: 0.0004 * 2500 = 1.00 TZS
UPDATE products
SET 
  price = ROUND((price * 2500.0)::numeric, 2),
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  price > 0 
  AND price < 1;

-- Step 2: Fix products with exactly 0.00 or NULL
-- Set to reasonable defaults based on category
UPDATE products
SET 
  price = CASE 
    WHEN category = 'Books' THEN 1000.00      -- TSh 1,000 = $0.40
    WHEN category = 'Music' THEN 1500.00      -- TSh 1,500 = $0.60
    WHEN category = 'Courses' THEN 5000.00    -- TSh 5,000 = $2.00
    WHEN category = 'Clothes' THEN 10000.00   -- TSh 10,000 = $4.00
    WHEN category = 'Electronics' THEN 50000.00  -- TSh 50,000 = $20.00
    WHEN category = 'Perfumes' THEN 15000.00  -- TSh 15,000 = $6.00
    WHEN category = 'Home Appliances' THEN 75000.00  -- TSh 75,000 = $30.00
    WHEN category = 'Kitchenware' THEN 25000.00  -- TSh 25,000 = $10.00
    WHEN category = 'Art & Crafts' THEN 20000.00  -- TSh 20,000 = $8.00
    ELSE 5000.00  -- Default TSh 5,000 = $2.00
  END,
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  price = 0 
  OR price IS NULL;

-- Step 3: Ensure all currencies are set
UPDATE products
SET 
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  currency IS NULL 
  OR currency = '';

-- Step 4: Fix any products that might have been set to other currencies
-- Convert them back to TZS equivalent
UPDATE products
SET 
  price = CASE 
    WHEN currency = 'USD' AND price > 0 THEN ROUND((price * 2500.0)::numeric, 2)
    WHEN currency = 'EUR' AND price > 0 THEN ROUND((price * 2500.0 / 0.92)::numeric, 2)
    WHEN currency = 'GBP' AND price > 0 THEN ROUND((price * 2500.0 / 0.79)::numeric, 2)
    WHEN currency = 'KES' AND price > 0 THEN ROUND((price * 2500.0 / 130.0)::numeric, 2)
    WHEN currency = 'UGX' AND price > 0 THEN ROUND((price * 2500.0 / 3700.0)::numeric, 2)
    WHEN currency = 'RWF' AND price > 0 THEN ROUND((price * 2500.0 / 1300.0)::numeric, 2)
    ELSE price
  END,
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  currency != 'TZS' 
  AND price > 0;

-- Log comprehensive results
DO $$
DECLARE
  total_products INT;
  updated_products INT;
  zero_price_remaining INT;
  min_price NUMERIC;
  max_price NUMERIC;
  avg_price NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO updated_products FROM products WHERE updated_at >= NOW() - INTERVAL '1 minute';
  SELECT COUNT(*) INTO zero_price_remaining FROM products WHERE price < 0.01;
  SELECT MIN(price) INTO min_price FROM products WHERE price > 0;
  SELECT MAX(price) INTO max_price FROM products;
  SELECT AVG(price) INTO avg_price FROM products WHERE price > 0;
  
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║   COMPLETE PRICE RESTORATION SUMMARY      ║';
  RAISE NOTICE '╠════════════════════════════════════════════╣';
  RAISE NOTICE '║ Total products:           % ', LPAD(total_products::TEXT, 15);
  RAISE NOTICE '║ Updated products:         % ', LPAD(updated_products::TEXT, 15);
  RAISE NOTICE '║ Zero-price remaining:     % ', LPAD(zero_price_remaining::TEXT, 15);
  RAISE NOTICE '║ Min price (TSh):          % ', LPAD(min_price::TEXT, 15);
  RAISE NOTICE '║ Max price (TSh):          % ', LPAD(max_price::TEXT, 15);
  RAISE NOTICE '║ Avg price (TSh):          % ', LPAD(ROUND(avg_price::numeric, 2)::TEXT, 15);
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  
  IF zero_price_remaining > 0 THEN
    RAISE WARNING '⚠️  Warning: % products still have zero/invalid prices!', zero_price_remaining;
  ELSE
    RAISE NOTICE '✅ All products now have valid TZS prices!';
  END IF;
END $$;

-- Final verification query
SELECT 
  '📊 Final Status' as report_type,
  COUNT(*) as total_products,
  COUNT(DISTINCT currency) as currency_types,
  string_agg(DISTINCT currency, ', ') as currencies,
  COUNT(*) FILTER (WHERE price = 0) as zero_price,
  COUNT(*) FILTER (WHERE price > 0 AND price < 100) as under_100,
  COUNT(*) FILTER (WHERE price >= 100 AND price < 1000) as range_100_1000,
  COUNT(*) FILTER (WHERE price >= 1000 AND price < 10000) as range_1k_10k,
  COUNT(*) FILTER (WHERE price >= 10000) as over_10k
FROM products;

-- Show sample prices by category
SELECT 
  category,
  currency,
  MIN(price) as min_price,
  MAX(price) as max_price,
  ROUND(AVG(price)::numeric, 2) as avg_price,
  COUNT(*) as product_count
FROM products
WHERE price > 0
GROUP BY category, currency
ORDER BY category, currency;

COMMIT;

-- Success message
SELECT '✅ Complete price restoration finished! All products should now have valid TZS prices.' as status;
