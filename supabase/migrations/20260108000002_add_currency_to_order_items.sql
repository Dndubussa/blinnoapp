-- Migration: Add currency column to order_items table
-- Date: 2026-01-08
-- Purpose: Track currency for each order item to support multi-currency orders
-- Author: Senior Developer

BEGIN;

-- Add currency column to order_items table with default TZS
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS';

-- Add CHECK constraint to validate currency values
ALTER TABLE public.order_items 
ADD CONSTRAINT valid_order_item_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Add comment describing the column
COMMENT ON COLUMN public.order_items.currency IS 'Currency in which price_at_purchase is denominated (ISO 4217 code)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_currency ON public.order_items(currency);

-- Backfill order_items currency from products where possible
UPDATE public.order_items oi
SET currency = COALESCE(p.currency, 'TZS')
FROM public.products p
WHERE oi.product_id = p.id 
  AND oi.currency = 'TZS'  -- Only update records that still have the default
  AND p.currency IS NOT NULL
  AND p.currency != 'TZS';

-- Log the changes
DO $$
DECLARE
  updated_count INT;
  usd_count INT;
  eur_count INT;
  tzs_count INT;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM public.order_items;
  SELECT COUNT(*) INTO usd_count FROM public.order_items WHERE currency = 'USD';
  SELECT COUNT(*) INTO eur_count FROM public.order_items WHERE currency = 'EUR';
  SELECT COUNT(*) INTO tzs_count FROM public.order_items WHERE currency = 'TZS';
  
  RAISE NOTICE '✅ Migration 20260108000002 completed successfully';
  RAISE NOTICE '   - Added currency column to order_items table';
  RAISE NOTICE '   - Added valid_order_item_currency CHECK constraint';
  RAISE NOTICE '   - Created idx_order_items_currency index';
  RAISE NOTICE '   - Total order items: %', updated_count;
  RAISE NOTICE '   - Currency breakdown: USD=%, EUR=%, TZS=%', usd_count, eur_count, tzs_count;
END $$;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT currency, COUNT(*) as count, MIN(price_at_purchase) as min_price, MAX(price_at_purchase) as max_price
-- FROM order_items
-- GROUP BY currency
-- ORDER BY count DESC;
