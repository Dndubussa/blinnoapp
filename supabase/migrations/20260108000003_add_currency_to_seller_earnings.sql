-- Migration: Add currency column to seller_earnings table
-- Date: 2026-01-08
-- Purpose: Track currency for seller earnings to support multi-currency payouts
-- Author: Senior Developer

BEGIN;

-- Add currency column to seller_earnings table with default TZS
ALTER TABLE public.seller_earnings 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS';

-- Add CHECK constraint to validate currency values
ALTER TABLE public.seller_earnings 
ADD CONSTRAINT valid_earnings_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Add comment describing the column
COMMENT ON COLUMN public.seller_earnings.currency IS 'Currency in which earnings are denominated (ISO 4217 code)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_seller_earnings_currency ON public.seller_earnings(currency);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller_currency ON public.seller_earnings(seller_id, currency);

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260108000003 completed successfully';
  RAISE NOTICE '   - Added currency column to seller_earnings table';
  RAISE NOTICE '   - Added valid_earnings_currency CHECK constraint';
  RAISE NOTICE '   - Created idx_seller_earnings_currency index';
  RAISE NOTICE '   - Created idx_seller_earnings_seller_currency index';
  RAISE NOTICE '   - Default currency: TZS';
  RAISE NOTICE '   - Note: No backfill needed (table is currently empty)';
END $$;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT COUNT(*) as total_earnings
-- FROM seller_earnings;
