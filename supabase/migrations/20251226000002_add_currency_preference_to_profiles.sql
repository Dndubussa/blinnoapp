-- Migration: Add currency_preference column to profiles table
-- Date: 2025-12-26
-- Purpose: Add currency_preference column to support user currency preferences

BEGIN;

-- Add currency_preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS currency_preference TEXT;

-- Add constraint to ensure currency_preference is one of the supported values
-- This will be enforced at the application level but helps with data integrity
-- We'll create a check constraint to limit to supported currencies
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_currency_preference 
CHECK (currency_preference IN ('USD', 'TZS', 'EUR', 'GBP', 'KES', 'UGX', 'RWF'));

-- Update existing profiles to have default currency if needed
UPDATE public.profiles 
SET currency_preference = 'USD' 
WHERE currency_preference IS NULL;

-- Update the RLS policies if needed (no changes needed since it's an optional field)

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT id, email, currency_preference 
-- FROM profiles 
-- ORDER BY updated_at DESC
-- LIMIT 10;