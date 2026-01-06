# Buyer Dashboard - Issues Quick Reference Guide

**Quick Navigation to All Issues & Fixes**

---

## Issue #1: Missing Import ✅ FIXED

**Location:** [src/pages/buyer/Messages.tsx](src/pages/buyer/Messages.tsx#L13)  
**Status:** ✅ RESOLVED  
**Severity:** 🔴 CRITICAL

### Problem
```tsx
Line 354: {sanitizeText(msg.content)}  // Function called
// But NO import statement for sanitizeText
```

### Fix Applied
```tsx
Line 13 (ADDED):
import { sanitizeText } from "@/lib/sanitize";
```

**Verification:**
```bash
$ npx tsc --noEmit
# Result: ✅ 0 errors
```

---

## Issue #2: Notifications Using Mock Data

**Location:** [src/pages/buyer/Notifications.tsx](src/pages/buyer/Notifications.tsx#L4-L24)  
**Status:** 🔴 CRITICAL  
**Severity:** CRITICAL - Feature non-functional

### Problem Lines
```tsx
Lines 4-24:
// HARDCODED MOCK DATA
const notifications = [
  {
    id: "1",
    type: "order",
    title: "Order Shipped",
    message: "Your order #12345678 has been shipped...",
    time: "2 hours ago",
    read: false,
  },
  // ... more mock data
];
```

### Why It's a Problem
- Users see same fake notifications every time
- Real order updates never appear
- No real-time updates
- Not connected to database
- No marking as read functionality

### Required Implementation
See [BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md](./BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md#-issue-2-notifications---mock-data-only)

**Effort:** 3-4 hours  
**Priority:** 🔴 CRITICAL

---

## Issue #3: Orders Page - No Pagination

**Location:** [src/pages/buyer/Orders.tsx](src/pages/buyer/Orders.tsx#L1-L190)  
**Status:** 🔴 HIGH  
**Severity:** HIGH - Performance issue

### Problem: Loads ALL Orders Without Limit

```tsx
Lines ~40-50 (approximate):
const { data: orders } = useQuery({
  queryKey: ['orders', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });
    // ❌ NO .range() or LIMIT clause!
    return data;
  },
});
```

### Impact
- With 100 orders: ~5KB of data (manageable)
- With 1,000 orders: ~50KB of data (slow)
- With 10,000 orders: ~500KB of data (unusable)
- No visual pagination UI
- No page size selector

### Required Implementation
See [BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md](./BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md#-issue-3-orders-without-pagination)

**Effort:** 2-3 hours  
**Priority:** 🔴 HIGH

---

## Issue #4: Zero Test Coverage

**Location:** ALL buyer dashboard pages  
**Status:** 🔴 CRITICAL  
**Severity:** CRITICAL - Reliability risk

### Current Coverage
```
File                  | Tests | Coverage
---------------------|-------|----------
Dashboard.tsx        | 0     | 0%
Overview.tsx         | 0     | 0%
Orders.tsx           | 0     | 0%
DigitalLibrary.tsx   | 0     | 0%
Payments.tsx         | 0     | 0%
Settings.tsx         | 0     | 0%
BuyerWishlist.tsx    | 0     | 0%
Messages.tsx         | 0     | 0%
Notifications.tsx    | 0     | 0%
---------------------|-------|----------
TOTAL                | 0     | 0%
```

### Required Tests by File

| File | Tests Needed | Effort |
|------|-------------|--------|
| Dashboard | 5-7 | 30-45 min |
| Overview | 7-10 | 45-60 min |
| Orders | 8-10 | 60-75 min |
| DigitalLibrary | 11-15 | 75-90 min |
| Payments | 9-12 | 60-75 min |
| Settings | 8-10 | 45-60 min |
| BuyerWishlist | 6-8 | 30-45 min |
| Messages | 12-15 | 75-90 min |
| Notifications | 8-10 | 45-60 min |
| **TOTAL** | **75-99** | **6-8 hours** |

### Test Templates Available
See [BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md](./BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md#-issue-4-test-coverage---critical-gap)

**Effort:** 6-8 hours  
**Priority:** 🔴 CRITICAL

---

## Issue #5: Messages - N+1 Query Problem

**Location:** [src/pages/buyer/Messages.tsx](src/pages/buyer/Messages.tsx#L59-L90)  
**Status:** 🟡 HIGH  
**Severity:** HIGH - Performance issue

### Problem: Multiple Queries Per Conversation

```tsx
Lines ~59-90 (approximate):
const enrichedConvos = await Promise.all(
  (convos || []).map(async (conv) => {
    // Query 1: Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", otherUserId)
      .single();

    // Query 2: Fetch last message
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Query 3: Count unread messages
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conv.id)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    // 3 QUERIES PER CONVERSATION!
  })
);
```

### Impact
- 10 conversations = 30 database queries
- 50 conversations = 150 database queries
- Load time increases linearly with conversation count
- Unoptimized Supabase usage

### Solution: Use Supabase Joins
See [BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md](./BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md#performance-optimization---messages-n1-fix)

**Expected Improvement:** 5-10x faster  
**Effort:** 2-3 hours  
**Priority:** 🟡 HIGH

---

## Issue #6: Download Progress Not Shown

**Location:** [src/pages/buyer/DigitalLibrary.tsx](src/pages/buyer/DigitalLibrary.tsx#L95-L110)  
**Status:** 🟡 MEDIUM  
**Severity:** MEDIUM - UX issue

### Problem: No Download Progress Indicator

```tsx
Lines ~95-110:
const handleSecureDownload = async (product: any) => {
  const filePath = getFilePath(product);
  
  if (!filePath) {
    toast.error("No downloadable file available for this product");
    return;
  }

  // ❌ No progress indicator
  // ❌ No download started feedback
  // ❌ No file size shown
  
  const { data, error } = await supabase
    .storage
    .from('product-files')
    .download(filePath);

  // ❌ No completion notification
};
```

### Missing Features
- ❌ Progress bar showing download %
- ❌ File size display
- ❌ Download speed indicator
- ❌ Estimated time remaining
- ❌ Cancel download option
- ❌ Download history

### Recommended Implementation
Add progress tracking using blob event listeners

**Effort:** 2 hours  
**Priority:** 🟡 MEDIUM

---

## Issue #7: Price Type Inconsistency

**Location:** [src/pages/buyer/BuyerWishlist.tsx](src/pages/buyer/BuyerWishlist.tsx#L39-L43)  
**Status:** 🟡 MEDIUM  
**Severity:** MEDIUM - Type safety

### Problem: Type Coercion on Price

```tsx
Lines 39-43:
onClick={() =>
  addToCart({
    id: product.id,
    title: product.title,
    // ❌ Type coercion needed - price should be typed consistently
    price: typeof product.price === 'string' 
      ? parseFloat(product.price) 
      : (product.price || 0),
    // ...
  })
}
```

### Why It's a Problem
- Product interface should have `price: number` not `string | number`
- Indicates inconsistent data source
- Runtime error risk if price is undefined
- Type safety violation

### Solution
Ensure product interface strictly types price as number

```tsx
interface Product {
  id: string;
  title: string;
  price: number;  // ✅ Not string | number
  // ...
}

// Then usage is clean:
price: product.price,
```

**Effort:** 1 hour  
**Priority:** 🟡 MEDIUM

---

## Issue #8: Limited XSS Protection

**Location:** [src/pages/buyer/Messages.tsx](src/pages/buyer/Messages.tsx#L354)  
**Status:** 🟡 MEDIUM  
**Severity:** MEDIUM - Security

### Problem: Only Using sanitizeText

```tsx
Line 354:
<p className="text-sm">{sanitizeText(msg.content)}</p>
```

### Current Protection
- ✅ Using `sanitizeText()` function from lib
- ❌ No DOMPurify library
- ❌ No input validation
- ❌ No rate limiting on message sending
- ❌ No content type validation

### Recommended Hardening
```tsx
import DOMPurify from 'dompurify';

const handleRender = (content: string) => {
  // Layer 1: Sanitize with DOMPurify
  const clean = DOMPurify.sanitize(content);
  // Layer 2: Additional escaping
  return sanitizeText(clean);
};

// Add to sendMessage:
if (!newMessage.trim() || newMessage.length > 5000) {
  // Prevent spam and long messages
  return;
}
```

**Effort:** 1-2 hours  
**Priority:** 🟡 MEDIUM

---

## Summary Table

| # | Issue | File | Status | Effort | Priority |
|---|-------|------|--------|--------|----------|
| 1 | Missing import | Messages.tsx | ✅ FIXED | 30s | 🔴 CRITICAL |
| 2 | Mock notifications | Notifications.tsx | ⏳ TODO | 3-4h | 🔴 CRITICAL |
| 3 | No pagination | Orders.tsx | ⏳ TODO | 2-3h | 🔴 HIGH |
| 4 | No tests | All files | ⏳ TODO | 6-8h | 🔴 CRITICAL |
| 5 | N+1 queries | Messages.tsx | ⏳ TODO | 2-3h | 🟡 HIGH |
| 6 | No progress | DigitalLibrary.tsx | ⏳ TODO | 2h | 🟡 MEDIUM |
| 7 | Type issue | BuyerWishlist.tsx | ⏳ TODO | 1h | 🟡 MEDIUM |
| 8 | XSS protection | Messages.tsx | ⏳ TODO | 1-2h | 🟡 MEDIUM |

---

## Implementation Order (Recommended)

### Critical Path (Must Do First)
```
1. ✅ Fix missing import (DONE)
2. Implement Notifications (3-4h)
3. Add pagination to Orders (2-3h)
4. Create test suite (6-8h)
```

### Performance Path (Next)
```
5. Fix N+1 queries (2-3h)
6. Add download progress (2h)
```

### Type Safety & Security (Final)
```
7. Fix type inconsistency (1h)
8. Add XSS protection (1-2h)
```

---

## File Index

| File | Size | Issues | Priority |
|------|------|--------|----------|
| [Dashboard.tsx](src/pages/buyer/Dashboard.tsx) | 136 | 0 | ✅ Good |
| [Overview.tsx](src/pages/buyer/Overview.tsx) | 319 | 0 | ✅ Good |
| [Orders.tsx](src/pages/buyer/Orders.tsx) | 190 | 1 | 🔴 Pagination |
| [DigitalLibrary.tsx](src/pages/buyer/DigitalLibrary.tsx) | 272 | 1 | 🟡 Progress |
| [Payments.tsx](src/pages/buyer/Payments.tsx) | 461 | 0 | ✅ Good |
| [Settings.tsx](src/pages/buyer/Settings.tsx) | 253 | 0 | ✅ Good |
| [BuyerWishlist.tsx](src/pages/buyer/BuyerWishlist.tsx) | 105 | 1 | 🟡 Types |
| [Messages.tsx](src/pages/buyer/Messages.tsx) | 404 | 3 | 🔴 Import (fixed), N+1, XSS |
| [Notifications.tsx](src/pages/buyer/Notifications.tsx) | 125 | 1 | 🔴 Mock data |

---

## Related Documentation

- **Full Analysis:** [BUYER_DASHBOARD_ANALYSIS.md](./BUYER_DASHBOARD_ANALYSIS.md) (3,000+ lines)
- **Implementation Guide:** [BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md](./BUYER_DASHBOARD_IMPLEMENTATION_PLAN.md) (500+ lines)
- **Executive Summary:** [BUYER_DASHBOARD_SUMMARY.md](./BUYER_DASHBOARD_SUMMARY.md)

---

**Last Updated:** January 2026  
**Status:** Analysis complete, Issue #1 fixed, 7 issues ready for implementation

