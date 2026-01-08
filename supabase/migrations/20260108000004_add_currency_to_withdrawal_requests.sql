-- Migration: Add currency column to withdrawal_requests table
-- Date: 2026-01-08
-- Purpose: Track currency for withdrawal amounts to support multi-currency payouts
-- Author: Senior Developer

BEGIN;

-- Add currency column to withdrawal_requests table with default TZS
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS';

-- Add CHECK constraint to validate currency values
ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT valid_withdrawal_currency 
CHECK (currency IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Add comment describing the column
COMMENT ON COLUMN public.withdrawal_requests.currency IS 'Currency in which withdrawal amount is denominated (ISO 4217 code)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_currency ON public.withdrawal_requests(currency);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_seller_currency ON public.withdrawal_requests(seller_id, currency);

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260108000004 completed successfully';
  RAISE NOTICE '   - Added currency column to withdrawal_requests table';
  RAISE NOTICE '   - Added valid_withdrawal_currency CHECK constraint';
  RAISE NOTICE '   - Created idx_withdrawal_requests_currency index';
  RAISE NOTICE '   - Created idx_withdrawal_requests_seller_currency index';
  RAISE NOTICE '   - Default currency: TZS';
  RAISE NOTICE '   - Note: No backfill needed (table is currently empty)';
END $$;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT COUNT(*) as total_withdrawals
-- FROM withdrawal_requests;
