-- Make phone_number and network nullable for hosted checkout payments
-- Hosted checkout doesn't require phone number upfront (collected by ClickPesa)
ALTER TABLE public.payment_transactions
ALTER COLUMN phone_number DROP NOT NULL,
ALTER COLUMN network DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.payment_transactions.phone_number IS 'Phone number for mobile money payments. NULL for hosted checkout (collected by ClickPesa).';
COMMENT ON COLUMN public.payment_transactions.network IS 'Mobile network for USSD push payments. NULL or empty for hosted checkout.';

