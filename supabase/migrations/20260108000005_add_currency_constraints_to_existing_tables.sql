-- Migration: Add CHECK constraints to existing currency columns
-- Date: 2026-01-08
-- Purpose: Ensure currency columns in products and payment_transactions have proper validation
-- Author: Senior Developer

BEGIN;

-- Add CHECK constraint to products.currency (if not exists)
ALTER TABLE public.products 
ADD CONSTRAINT valid_product_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Add CHECK constraint to payment_transactions.currency (if not exists)
ALTER TABLE public.payment_transactions 
ADD CONSTRAINT valid_payment_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Verify data integrity
DO $$
DECLARE
  invalid_products INT;
  invalid_transactions INT;
  invalid_orders INT;
  invalid_order_items INT;
  invalid_earnings INT;
  invalid_withdrawals INT;
BEGIN
  -- Check for invalid currency values in products
  SELECT COUNT(*) INTO invalid_products
  FROM public.products
  WHERE currency IS NOT NULL 
    AND currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  -- Check for invalid currency values in payment_transactions
  SELECT COUNT(*) INTO invalid_transactions
  FROM public.payment_transactions
  WHERE currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  -- Check for invalid currency values in orders
  SELECT COUNT(*) INTO invalid_orders
  FROM public.orders
  WHERE currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  -- Check for invalid currency values in order_items
  SELECT COUNT(*) INTO invalid_order_items
  FROM public.order_items
  WHERE currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  -- Check for invalid currency values in seller_earnings
  SELECT COUNT(*) INTO invalid_earnings
  FROM public.seller_earnings
  WHERE currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  -- Check for invalid currency values in withdrawal_requests
  SELECT COUNT(*) INTO invalid_withdrawals
  FROM public.withdrawal_requests
  WHERE currency NOT IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF');
  
  RAISE NOTICE '✅ Migration 20260108000005 completed successfully';
  RAISE NOTICE '   - Added valid_product_currency CHECK constraint';
  RAISE NOTICE '   - Added valid_payment_currency CHECK constraint';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Data Integrity Report:';
  RAISE NOTICE '   - Invalid products: %', invalid_products;
  RAISE NOTICE '   - Invalid payment_transactions: %', invalid_transactions;
  RAISE NOTICE '   - Invalid orders: %', invalid_orders;
  RAISE NOTICE '   - Invalid order_items: %', invalid_order_items;
  RAISE NOTICE '   - Invalid seller_earnings: %', invalid_earnings;
  RAISE NOTICE '   - Invalid withdrawal_requests: %', invalid_withdrawals;
  
  IF (invalid_products + invalid_transactions + invalid_orders + invalid_order_items + invalid_earnings + invalid_withdrawals) = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL DATA INTEGRITY CHECKS PASSED';
  ELSE
    RAISE WARNING '⚠️ Some data integrity issues found - review above';
  END IF;
END $$;

COMMIT;

-- Summary query
-- SELECT 
--   'products' as table_name, COUNT(*) as total_rows, COUNT(DISTINCT currency) as unique_currencies
-- FROM public.products
-- UNION ALL
-- SELECT 
--   'orders', COUNT(*), COUNT(DISTINCT currency)
-- FROM public.orders
-- UNION ALL
-- SELECT 
--   'order_items', COUNT(*), COUNT(DISTINCT currency)
-- FROM public.order_items
-- UNION ALL
-- SELECT 
--   'payment_transactions', COUNT(*), COUNT(DISTINCT currency)
-- FROM public.payment_transactions
-- UNION ALL
-- SELECT 
--   'profiles (currency_preference)', COUNT(*), COUNT(DISTINCT currency_preference)
-- FROM public.profiles;
