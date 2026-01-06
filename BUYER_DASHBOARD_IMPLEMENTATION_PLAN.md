# Buyer Dashboard - Implementation Plan & Quick Fixes

**Status:** Analysis Complete  
**Date:** January 2026  
**Priority Issues Fixed:** 1/8  
**Remaining Critical Issues:** 7

---

## ✅ Issue #1: Missing Import - FIXED

**File:** `src/pages/buyer/Messages.tsx`  
**Issue:** Function `sanitizeText()` called on line 354 without import  
**Fix Applied:** Added `import { sanitizeText } from "@/lib/sanitize";`  
**Status:** ✅ RESOLVED

**Verification:**
```bash
$ npx tsc --noEmit  # Should show 0 errors (previously would error)
```

---

## 🔴 Issue #2: Notifications - Mock Data Only

**File:** `src/pages/buyer/Notifications.tsx`  
**Severity:** CRITICAL  
**Current State:** Using hardcoded mock notifications  
**Required Implementation:** Connect to actual database

### Implementation Steps:

**Step 1: Ensure Database Table Exists**
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'order', 'promo', 'wishlist', 'message'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB, -- for storing order_id, product_id, etc.
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX notifications_read_idx ON notifications(read);
```

**Step 2: Update Notifications.tsx**
```tsx
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function BuyerNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  };

  const displayNotifications = notificationsData || notifications;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ... existing JSX ... */}
      {displayNotifications.map((notification) => (
        <Card key={notification.id} onClick={() => markAsRead(notification.id)}>
          {/* ... notification display ... */}
        </Card>
      ))}
    </div>
  );
}
```

**Effort:** 3-4 hours  
**Dependencies:** Database schema creation, RLS policies  
**Testing:** Integration tests with mock Supabase data

---

## 🔴 Issue #3: Orders Without Pagination

**File:** `src/pages/buyer/Orders.tsx`  
**Severity:** HIGH  
**Current Problem:** All orders fetched without limit  
**Impact:** Performance issues with 100+ orders

### Implementation Steps:

**Step 1: Add State for Pagination**
```tsx
import { useState } from 'react';

export default function BuyerOrders() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ... rest of component
}
```

**Step 2: Update Query**
```tsx
const { data: orders } = useQuery({
  queryKey: ['orders', user?.id, page],
  queryFn: async () => {
    const offset = (page - 1) * pageSize;
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) throw error;
    return { orders: data || [], total: count || 0 };
  },
});

const totalPages = Math.ceil((orders?.total || 0) / pageSize);
```

**Step 3: Add Pagination UI**
```tsx
<div className="flex items-center justify-between mt-6">
  <Button
    disabled={page === 1}
    onClick={() => setPage(p => p - 1)}
    variant="outline"
  >
    Previous
  </Button>
  
  <span className="text-sm text-muted-foreground">
    Page {page} of {totalPages}
  </span>
  
  <Button
    disabled={page >= totalPages}
    onClick={() => setPage(p => p + 1)}
    variant="outline"
  >
    Next
  </Button>
</div>
```

**Effort:** 2-3 hours  
**Testing:** Test with 50+ orders, verify pagination works

---

## 🟡 Issue #4: Test Coverage - CRITICAL GAP

**Current State:** 0% coverage  
**Target:** 85%+ coverage  
**Files Needed:** 9 test files  
**Total Test Cases:** 75-99

### Quick Start Template:

**File:** `src/__tests__/buyer/overview.test.tsx`
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuyerOverview from '@/pages/buyer/Overview';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client');

describe('BuyerOverview', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
    } as any);
  });

  it('should render 4 stat cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuyerOverview />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Orders/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Orders/i)).toBeInTheDocument();
      expect(screen.getByText(/Digital Products/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
    });
  });

  it('should display recent orders', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuyerOverview />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Recent Orders/i)).toBeInTheDocument();
    });
  });

  // Add more tests...
});
```

**Effort:** 6-8 hours (all files)  
**Priority:** CRITICAL

---

## Performance Optimization - Messages N+1 Fix

**File:** `src/pages/buyer/Messages.tsx`  
**Issue:** For each conversation, fetches profile + last message separately

### Current (Inefficient):
```tsx
const enrichedConvos = await Promise.all(
  (convos || []).map(async (conv) => {
    const { data: profile } = await supabase.from('profiles').select('*');
    const { data: lastMsg } = await supabase.from('messages').select('*');
    const { count: unreadCount } = await supabase.from('messages').select('*', { count: 'exact' });
    // 3 queries per conversation!
  })
);
```

### Optimized (Using Joins):
```tsx
const { data: enrichedConvos } = await supabase
  .from('conversations')
  .select(`
    *,
    seller_profile:seller_id(id, full_name, avatar_url),
    buyer_profile:buyer_id(id, full_name, avatar_url),
    last_message:messages(content, created_at)
  `)
  .eq('buyer_id', user.id)
  .order('last_message_at', { ascending: false })
  .limit(1, { foreignTable: 'messages' });
```

**Expected Performance Gain:** 5-10x faster  
**Effort:** 2-3 hours

---

## Summary of Issues & Estimated Fixes

| # | Issue | Status | Effort | Priority |
|---|-------|--------|--------|----------|
| 1 | Missing import (sanitizeText) | ✅ FIXED | 30s | 🔴 CRITICAL |
| 2 | Notifications (mock data) | ⏳ READY | 3-4h | 🔴 CRITICAL |
| 3 | Orders (no pagination) | ⏳ READY | 2-3h | 🔴 CRITICAL |
| 4 | Test coverage (0%) | ⏳ READY | 6-8h | 🔴 CRITICAL |
| 5 | Messages (N+1 queries) | ⏳ READY | 2-3h | 🟡 HIGH |
| 6 | Download progress missing | ⏳ READY | 2h | 🟡 MEDIUM |
| 7 | Price type inconsistency | ⏳ READY | 1h | 🟡 MEDIUM |
| 8 | XSS protection | ⏳ READY | 1h | 🟡 MEDIUM |

**Total Estimated Effort:** 17-21 hours  
**Recommended Completion:** 2-3 weeks  
**Current Progress:** 1 fixed, 7 ready for implementation

---

## Next Steps

1. ✅ **DONE:** Fix missing import (Messages.tsx)
2. **TODO:** Implement Notifications (connect to DB)
3. **TODO:** Add pagination to Orders
4. **TODO:** Create test suite (9 files)
5. **TODO:** Optimize Messages queries
6. **TODO:** Add download progress
7. **TODO:** Fix type consistency
8. **TODO:** Add XSS protection

**Recommended Sprint:** 2 weeks for critical fixes, 1-2 weeks for tests

