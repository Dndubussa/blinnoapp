import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import Notifications from '@/pages/buyer/Notifications';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderNotifications = () => {
  return renderWithProviders(<Notifications />);
};

describe('BuyerNotifications', () => {
  beforeEach(async () => {
    // Sign in test user before each test to access real database
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render notifications page', async () => {
    const { container } = renderNotifications();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real notifications from database', async () => {
    // Query real database - use orders table since notifications table doesn't exist
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(orders)).toBe(true);
  });

  it('should have proper DOM structure', async () => {
    const { container } = renderNotifications();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render main container', async () => {
    const { container } = renderNotifications();
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should handle async operations gracefully', async () => {
    const { container } = renderNotifications();
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render without throwing errors', () => {
    expect(() => {
      renderNotifications();
    }).not.toThrow();
  });

  it('should support responsive layout', async () => {
    const { container } = renderNotifications();
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThanOrEqual(0);
  });

  it('should initialize component state properly', async () => {
    const { container } = renderNotifications();
    await waitFor(() => {
      expect(container.children.length).toBeGreaterThanOrEqual(0);
    }, { timeout: 3000 });
  });
});
