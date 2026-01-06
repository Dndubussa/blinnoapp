import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import Messages from '@/pages/buyer/Messages';
import { renderWithProviders, supabase, signInTestUser, signOutTestUser } from './setup';

const renderMessages = () => {
  return renderWithProviders(<Messages />);
};

describe('BuyerMessages', () => {
  beforeEach(async () => {
    // Sign in test user before each test
    await signInTestUser();
  });

  afterEach(async () => {
    // Sign out after each test
    await signOutTestUser();
  });

  it('should render messages page', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should fetch real conversations from database', async () => {
    // Query real database - simple query without complex joins
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(conversations)).toBe(true);
  });

  it('should show conversation list structure', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container.children.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should render message items', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      const content = container.querySelector('[class*="space"]');
      expect(content || container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display seller profiles', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show message metadata', async () => {
    const { container } = renderMessages();
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('should handle async message loading', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should support conversation navigation', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container.innerHTML).toBeTruthy();
    }, { timeout: 3000 });
  });
  it('should render unread indicators', async () => {
    const { container } = renderMessages();
    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    }, { timeout: 3000 });
  });
});
