-- Migration: Add currency column to orders table
-- Date: 2026-01-08
-- Purpose: Track currency for order totals to support multi-currency orders
-- Author: Senior Developer

BEGIN;

-- Add currency column to orders table with default TZS
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS';

-- Add CHECK constraint to validate currency values
ALTER TABLE public.orders 
ADD CONSTRAINT valid_order_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Add comment describing the column
COMMENT ON COLUMN public.orders.currency IS 'Currency in which order total_amount is denominated (ISO 4217 code)';

-- Create index for better query performance on currency lookups
CREATE INDEX IF NOT EXISTS idx_orders_currency ON public.orders(currency);

-- Log the changes
DO $$
DECLARE
  column_count INT;
  constraint_count INT;
BEGIN
  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'currency';
  
  RAISE NOTICE '✅ Migration 20260108000001 completed successfully';
  RAISE NOTICE '   - Added currency column to orders table';
  RAISE NOTICE '   - Added valid_order_currency CHECK constraint';
  RAISE NOTICE '   - Created idx_orders_currency index';
  RAISE NOTICE '   - Default currency: TZS for existing orders';
END $$;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT COUNT(*) as total_orders, COUNT(DISTINCT currency) as unique_currencies 
-- FROM orders;
