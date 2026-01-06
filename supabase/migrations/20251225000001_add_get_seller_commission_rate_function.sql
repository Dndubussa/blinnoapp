-- Create function to get seller commission rate based on their subscription plan
-- This function returns the commission rate for a given seller based on their current subscription plan

CREATE OR REPLACE FUNCTION public.get_seller_commission_rate(p_seller_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_subscription_status TEXT;
  v_commission_rate NUMERIC;
BEGIN
  -- Get the current subscription for the seller
  SELECT 
    plan,
    status
  INTO 
    v_plan,
    v_subscription_status
  FROM public.seller_subscriptions
  WHERE seller_id = p_seller_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no subscription exists or it's not active, use default rate
  IF v_plan IS NULL OR v_subscription_status != 'active' THEN
    RETURN 0.05; -- Default 5% commission rate
  END IF;

  -- Determine commission rate based on subscription plan
  -- Subscription plans (monthly fees with lower commission rates)
  IF v_plan = 'subscription_starter' THEN
    v_commission_rate := 0.05; -- 5% for Starter plan
  ELSIF v_plan = 'subscription_professional' THEN
    v_commission_rate := 0.03; -- 3% for Professional plan
  ELSIF v_plan = 'subscription_enterprise' THEN
    v_commission_rate := 0.01; -- 1% for Enterprise plan
  -- Percentage plans (no monthly fee but higher per-transaction rates)
  ELSIF v_plan = 'percentage_basic' THEN
    v_commission_rate := 0.07; -- 7% for Basic percentage plan
  ELSIF v_plan = 'percentage_growth' THEN
    v_commission_rate := 0.10; -- 10% for Growth percentage plan
  ELSIF v_plan = 'percentage_scale' THEN
    v_commission_rate := 0.15; -- 15% for Scale percentage plan
  ELSE
    -- For any other plan types, default to 5%
    v_commission_rate := 0.05;
  END IF;

  RETURN v_commission_rate;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION public.get_seller_commission_rate IS 'Returns the commission rate for a seller based on their current subscription plan. Used to calculate platform fees for seller earnings.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_seller_commission_rate TO authenticated;