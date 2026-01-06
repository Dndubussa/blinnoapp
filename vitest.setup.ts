import '@testing-library/jest-dom';
import { expect, afterEach, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Use real Supabase client for database connections
export { supabase };

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    profile: { id: 'test-user-id', full_name: 'Test User', avatar_url: null },
    roles: ['buyer'],
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    hasRole: vi.fn(() => true),
    becomeSeller: vi.fn(),
  })),
  AuthProvider: ({ children }: any) => children,
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock useWishlist hook
vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: vi.fn(() => ({
    items: [],
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isLoading: false,
  })),
  WishlistProvider: ({ children }: any) => children,
}));

// Mock useCart hook
vi.mock('@/hooks/useCart', () => ({
  useCart: vi.fn(() => ({
    items: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    isLoading: false,
  })),
  CartProvider: ({ children }: any) => children,
}));

// Suppress specific console warnings (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('useAuth must be used within') ||
       args[0].includes('useWishlist must be used within') ||
       args[0].includes('useCart must be used within'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
