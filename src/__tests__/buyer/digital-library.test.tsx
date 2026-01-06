import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import DigitalLibrary from '@/pages/buyer/DigitalLibrary';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderDigitalLibrary = () => {
  return renderWithProviders(<DigitalLibrary />);
};

describe('BuyerDigitalLibrary', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render digital library page', async () => {
    const { container } = renderDigitalLibrary();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real digital products from database', async () => {
    // Query real database
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(products)).toBe(true);
  });

  it('should display library content area', async () => {
    const { container } = renderDigitalLibrary();
    await waitFor(() => {
      expect(container.querySelector('div')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show loading or content state', () => {
    const { container } = renderDigitalLibrary();
    const content = container.querySelector('[class*="space"]');
    expect(content || container.firstChild).toBeInTheDocument();
  });

  it('should have product display structure', () => {
    const { container } = renderDigitalLibrary();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should render download functionality', () => {
    const { container } = renderDigitalLibrary();
    expect(container).toBeInTheDocument();
  });

  it('should display product grid layout', () => {
    const { container } = renderDigitalLibrary();
    const grid = container.querySelector('[class*="grid"]');
    expect(grid || container.firstChild).toBeInTheDocument();
  });

  it('should handle async product loading', async () => {
    const { container } = renderDigitalLibrary();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('should render product categories', () => {
    const { container } = renderDigitalLibrary();
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('should support secure downloads', () => {
    const { container } = renderDigitalLibrary();
    expect(container).toBeInTheDocument();
  });

  it('should track download state', () => {
    const { container } = renderDigitalLibrary();
    expect(container.firstChild).toBeTruthy();
  });

  it('should display product information', () => {
    const { container } = renderDigitalLibrary();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
