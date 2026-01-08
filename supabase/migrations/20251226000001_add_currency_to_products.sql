-- Migration: Add currency column to products table
-- Date: 2025-12-26
-- Purpose: Add currency column to support multi-currency functionality

BEGIN;

-- Add currency column to products table with default value TZS
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TZS';

-- Update the column to allow NULL values (to match the intended multi-currency design)
ALTER TABLE public.products 
ALTER COLUMN currency DROP NOT NULL;

-- Set default currency to TZS for existing products
UPDATE public.products 
SET currency = 'TZS' 
WHERE currency IS NULL OR currency = '';

-- Create an index on the currency column for better performance
CREATE INDEX IF NOT EXISTS idx_products_currency ON public.products(currency);

-- Update the RLS policies to include the new column in permissions if needed
-- (No changes needed since it's a simple column addition)

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT id, title, price, currency, updated_at 
-- FROM products 
-- ORDER BY updated_at DESC
-- LIMIT 10;