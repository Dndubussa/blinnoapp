-- Migration: Ensure all products have valid currency fields
-- Date: 2025-01-23
-- Purpose: Set default currency for products without one (keeps multi-currency support)
--          This migration does NOT convert prices - it preserves seller's original pricing
--
-- Strategy:
-- 1. Products with NULL or empty currency: Set to TZS (default for Tanzania-based marketplace)
-- 2. Products with existing valid currency: Keep as-is
-- 3. No price conversions - sellers' original prices are preserved

BEGIN;

-- Step 1: Set default currency (TZS) for products with NULL or empty currency
-- These products likely were created with TZS in mind but currency wasn't set
UPDATE products
SET 
  currency = 'TZS',
  updated_at = NOW()
WHERE 
  currency IS NULL 
  OR currency = '';

-- Step 2: Ensure all valid currencies are uppercase (data consistency)
UPDATE products
SET 
  currency = UPPER(currency),
  updated_at = NOW()
WHERE 
  currency IS NOT NULL
  AND currency != UPPER(currency);

-- Log the migration results
DO $$
DECLARE
  total_products INT;
  currency_breakdown TEXT;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  
  -- Get currency distribution
  SELECT string_agg(currency || ': ' || count, ', ') INTO currency_breakdown
  FROM (
    SELECT currency, COUNT(*)::TEXT as count
    FROM products
    GROUP BY currency
    ORDER BY COUNT(*) DESC
  ) AS currency_counts;
  
  RAISE NOTICE 'Multi-currency system verified:';
  RAISE NOTICE '  Total products: %', total_products;
  RAISE NOTICE '  Currency distribution: %', currency_breakdown;
  RAISE NOTICE 'Sellers can price in their preferred currency!';
END $$;

COMMIT;
