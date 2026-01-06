import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Test user credentials for real database testing
export const TEST_USER = {
  email: 'test-buyer@blinno.local',
  password: 'TestPassword123!',
  userId: 'test-buyer-id',
};

// Create test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// Sign in test user for authentication - gracefully handle missing user
export async function signInTestUser() {
  try {
    // Try to get current session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return session;
    }
    
    // Try to sign in with test credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    
    if (error) {
      console.log('Test user sign-in skipped - using anonymous access:', error.message);
      // Continue with anonymous/unauthenticated session
      return null;
    }
    
    return data?.session || null;
  } catch (error) {
    console.log('Test auth setup skipped - will use real database with current session');
    return null;
  }
}

// Sign out test user
export async function signOutTestUser() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.log('Sign-out error (non-fatal):', error);
  }
}

// Render with providers for real database access
export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        BrowserRouter,
        null,
        children
      )
    );
  
  return render(ui, { wrapper: Wrapper });
}

// Export Supabase client for direct database queries in tests
export { supabase };
