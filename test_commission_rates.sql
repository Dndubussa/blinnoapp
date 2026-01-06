-- Test script to verify the get_seller_commission_rate function works correctly
-- This script creates test data and verifies that different subscription plans return different commission rates

-- Test 1: Create a test seller with a subscription_starter plan
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test-starter@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test-starter@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_subscriptions (seller_id, plan, status, price_monthly, started_at, expires_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'subscription_starter', 'active', 25000, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (seller_id) DO UPDATE SET
  plan = 'subscription_starter',
  status = 'active',
  expires_at = NOW() + INTERVAL '30 days';

-- Test 2: Create a test seller with a subscription_professional plan
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'test-professional@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'test-professional@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_subscriptions (seller_id, plan, status, price_monthly, started_at, expires_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'subscription_professional', 'active', 75000, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (seller_id) DO UPDATE SET
  plan = 'subscription_professional',
  status = 'active',
  expires_at = NOW() + INTERVAL '30 days';

-- Test 3: Create a test seller with a subscription_enterprise plan
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'test-enterprise@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'test-enterprise@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_subscriptions (seller_id, plan, status, price_monthly, started_at, expires_at)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'subscription_enterprise', 'active', 250000, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (seller_id) DO UPDATE SET
  plan = 'subscription_enterprise',
  status = 'active',
  expires_at = NOW() + INTERVAL '30 days';

-- Test 4: Create a test seller with a percentage_basic plan
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'test-basic@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'test-basic@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_subscriptions (seller_id, plan, status, price_monthly, started_at, expires_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'percentage_basic', 'active', 0, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (seller_id) DO UPDATE SET
  plan = 'percentage_basic',
  status = 'active',
  expires_at = NOW() + INTERVAL '30 days';

-- Test 5: Create a test seller with an expired subscription (should get default rate)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'test-expired@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'test-expired@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seller_subscriptions (seller_id, plan, status, price_monthly, started_at, expires_at)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'subscription_starter', 'active', 25000, NOW(), NOW() - INTERVAL '1 day')
ON CONFLICT (seller_id) DO UPDATE SET
  plan = 'subscription_starter',
  status = 'active',
  expires_at = NOW() - INTERVAL '1 day';

-- Test 6: Create a test seller with no subscription (should get default rate)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) 
VALUES 
  ('66666666-6666-6666-6666-666666666666', 'test-no-sub@example.com', 'dummy_password', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email) 
VALUES 
  ('66666666-6666-6666-6666-666666666666', 'test-no-sub@example.com')
ON CONFLICT (id) DO NOTHING;

-- Run the tests
SELECT 'Test 1 - Starter Plan (should return 0.05)' as test_case, get_seller_commission_rate('11111111-1111-1111-1111-111111111111') as commission_rate
UNION ALL
SELECT 'Test 2 - Professional Plan (should return 0.03)' as test_case, get_seller_commission_rate('22222222-2222-2222-2222-222222222222') as commission_rate
UNION ALL
SELECT 'Test 3 - Enterprise Plan (should return 0.01)' as test_case, get_seller_commission_rate('33333333-3333-3333-3333-333333333333') as commission_rate
UNION ALL
SELECT 'Test 4 - Basic Percentage Plan (should return 0.07)' as test_case, get_seller_commission_rate('44444444-4444-4444-4444-444444444444') as commission_rate
UNION ALL
SELECT 'Test 5 - Expired Subscription (should return 0.05 - default)' as test_case, get_seller_commission_rate('55555555-5555-5555-5555-555555555555') as commission_rate
UNION ALL
SELECT 'Test 6 - No Subscription (should return 0.05 - default)' as test_case, get_seller_commission_rate('66666666-6666-6666-6666-666666666666') as commission_rate;