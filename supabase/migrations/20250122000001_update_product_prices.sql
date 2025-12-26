-- Migration: Update unrealistically low product prices
-- Date: 2025-01-22
-- Purpose: Fix products with prices below minimum thresholds by multiplying by 10,000
--          This converts test prices (0.4 TZS) to realistic prices (4,000 TZS)

-- Before running this migration, current prices are:
-- 0.4 TZS, 0.6 TZS, 0.35 TZS, 1.5 TZS, etc. (cents range)
-- After: 4,000 TZS, 6,000 TZS, 3,500 TZS, 15,000 TZS (realistic range)

BEGIN;

-- Update all products with prices below reasonable minimums
-- This applies to all currencies but primarily affects TZS-priced products

-- Step 1: Update Books with price < 2000 (assuming TZS or equivalent low prices)
UPDATE products
SET 
  price = price * 10000,
  updated_at = NOW()
WHERE 
  category = 'Books' 
  AND price < 2000
  AND price > 0;

-- Step 2: Update Music with price < 1000
UPDATE products
SET 
  price = price * 10000,
  updated_at = NOW()
WHERE 
  category = 'Music' 
  AND price < 1000
  AND price > 0;

-- Step 3: Update Courses with price < 5000
UPDATE products
SET 
  price = price * 10000,
  updated_at = NOW()
WHERE 
  category = 'Courses' 
  AND price < 5000
  AND price > 0;

-- Step 4: Update Physical Products (Clothes, Electronics, etc.) with price < 3000
UPDATE products
SET 
  price = price * 10000,
  updated_at = NOW()
WHERE 
  category IN ('Clothes', 'Electronics', 'Home Appliances', 'Kitchenware', 'Perfumes', 'Art & Crafts', 'Other')
  AND price < 3000
  AND price > 0;

-- Log the migration
DO $$
DECLARE
  updated_count INT;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM products 
  WHERE updated_at >= NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Price migration completed. Updated % products.', updated_count;
END $$;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT id, title, category, price, currency, updated_at 
-- FROM products 
-- WHERE updated_at >= NOW() - INTERVAL '1 hour'
-- ORDER BY updated_at DESC;
