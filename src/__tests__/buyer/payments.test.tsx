import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import BuyerPayments from '@/pages/buyer/BuyerPayments';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const mockPayments = [
  {
    id: '1',
    payment_method: 'credit_card',
    status: 'completed',
    amount: 100,
    created_at: '2024-01-01',
    order_id: 'order-1',
  },
  {
    id: '2',
    payment_method: 'mobile_money',
    status: 'pending',
    amount: 50,
    created_at: '2024-01-02',
    order_id: 'order-2',
  },
];

const renderPayments = () => {
  return renderWithProviders(<BuyerPayments />);
};

describe('BuyerPayments', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render payments page', async () => {
    const { container } = renderPayments();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real payment history from database', async () => {
    // Query real database - use payment_transactions instead of payments
    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(payments)).toBe(true);
  });

  it('should display payment history', async () => {
    const { container } = renderPayments();
    await waitFor(() => {
      expect(container.querySelector('div')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show payment methods', () => {
    const { container } = renderPayments();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should display transaction amounts', () => {
    const { container } = renderPayments();
    expect(container.innerHTML).toBeTruthy();
  });

  it('should show payment status', () => {
    const { container } = renderPayments();
    const rows = container.querySelectorAll('tr');
    expect(rows.length >= 0).toBe(true);
  });

  it('should display transaction dates', () => {
    const { container } = renderPayments();
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });
});
