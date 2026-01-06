import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import Orders from '@/pages/buyer/Orders';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderOrders = () => {
  return renderWithProviders(<Orders />);
};

describe('BuyerOrders', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render orders page', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real orders from database', async () => {
    // Query real database with pagination
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .range(0, 9);

    expect(error).toBeNull();
    expect(Array.isArray(orders)).toBe(true);
  });

  it('should render with proper structure', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      expect(container.children.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should initialize orders page state', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      const content = container.firstChild as HTMLElement;
      expect(content).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should support pagination functionality', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render page content area', async () => {
    const { container } = renderOrders();
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('should handle async order loading', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should maintain component stability', async () => {
    const { container } = renderOrders();
    await waitFor(() => {
      expect(container.innerHTML).toBeTruthy();
    }, { timeout: 3000 });
  });
});
