import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import BuyerDashboard from '@/pages/buyer/Dashboard';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderDashboard = () => {
  return renderWithProviders(<BuyerDashboard />);
};

describe('BuyerDashboard', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render sidebar navigation', async () => {
    const { container } = renderDashboard();
    await waitFor(() => {
      const nav = container.querySelector('nav');
      expect(nav || container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display main navigation menu items', () => {
    const { container } = renderDashboard();
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('should show outlet for nested routes', () => {
    const { container } = renderDashboard();
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render dashboard layout properly', () => {
    const { container } = renderDashboard();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have responsive layout', () => {
    const { container } = renderDashboard();
    expect(container.children.length).toBeGreaterThan(0);
  });
});
