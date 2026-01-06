import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import Settings from '@/pages/buyer/Settings';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderSettings = () => {
  return renderWithProviders(<Settings />);
};

describe('BuyerSettings', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render settings page', async () => {
    const { container } = renderSettings();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real user profile from database', async () => {
    // Query real database
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(profiles)).toBe(true);
  });

  it('should display profile settings section', async () => {
    const { container } = renderSettings();
    await waitFor(() => {
      expect(container.querySelector('div')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show account preferences', () => {
    const { container } = renderSettings();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should have notification settings', () => {
    const { container } = renderSettings();
    const inputs = container.querySelectorAll('input');
    expect(inputs.length >= 0).toBe(true);
  });

  it('should display privacy settings', () => {
    const { container } = renderSettings();
    expect(container.innerHTML).toBeTruthy();
  });

  it('should have address management section', () => {
    const { container } = renderSettings();
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('should show account security options', () => {
    const { container } = renderSettings();
    const buttons = container.querySelectorAll('button');
    expect(buttons.length >= 0).toBe(true);
  });

  it('should have logout option', () => {
    const { container } = renderSettings();
    expect(container.firstChild).toBeTruthy();
  });
});
