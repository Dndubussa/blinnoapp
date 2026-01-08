# 🔴 CRITICAL: Analytics Currency Logic Issues

**Status**: Multiple currency handling bugs identified  
**Severity**: HIGH - Affects financial reporting  
**Date**: January 8, 2026

---

## 📊 ISSUES FOUND

### 1. **HARDCODED CURRENCY IN TOP PRODUCTS TABLE** (Critical)

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L533)
**Location**: Lines 533-539

```tsx
<div className="font-bold">${product.revenue.toFixed(2)}</div>
```

**Problem**:
- All product revenues are displayed with `$` (USD) symbol
- Revenue values are NOT being formatted with `formatPrice()` helper
- Ignores seller's currency preference entirely
- Shows wrong symbol and may not convert currency

**Example Issue**:
- Seller's currency preference: TZS
- Product revenue in database: 50000 TZS
- Displayed as: `$50000.00` (should be `TSh 50,000.00`)

**Expected Fix**:
```tsx
<div className="font-bold">
  {formatPrice(product.revenue, sellerCurrency)}
</div>
```

---

### 2. **MISSING CURRENCY DISPLAY IN TOP PRODUCTS** (High)

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L524-L539)

**Problem**:
- Top Products section shows raw numbers without any currency symbol or formatting
- No indicator of what currency the amounts are in
- Users won't know if `50000` is USD, TZS, or another currency

**Current Code**:
```tsx
<div className="text-right">
  <div className="font-bold">${product.revenue.toFixed(2)}</div>
  <div className="text-xs text-muted-foreground">
    {product.sales} {product.sales === 1 ? 'sale' : 'sales'}
  </div>
</div>
```

**Issue**: Hardcoded `$` symbol doesn't respect seller's currency

---

### 3. **WITHDRAWAL DIALOG HARDCODES TZS** (High)

**File**: [src/pages/seller/Earnings.tsx](src/pages/seller/Earnings.tsx#L154)
**Location**: Line 154

```tsx
<Label htmlFor="amount">Amount (TZS)</Label>
```

**Problem**:
- Withdrawal form always shows "Amount (TZS)" label
- Seller's currency preference is set via `sellerCurrency` state
- But label doesn't dynamically update
- Confuses sellers in other currencies

**Current Code**:
```tsx
<Label htmlFor="amount">Amount (TZS)</Label>
<Input
  id="amount"
  type="number"
  placeholder="Enter amount"
  value={withdrawAmount}
  onChange={(e) => setWithdrawAmount(e.target.value)}
/>
```

**Should Be**:
```tsx
<Label htmlFor="amount">Amount ({sellerCurrency})</Label>
```

---

### 4. **TOAST MESSAGE HARDCODES TZS** (High)

**File**: [src/pages/seller/Earnings.tsx](src/pages/seller/Earnings.tsx#L133)
**Location**: Line 133

```tsx
toast({
  title: "Withdrawal Requested",
  description: `Your withdrawal of TZS ${amount.toLocaleString()} is being processed`
});
```

**Problem**:
- Success toast always shows "TZS" regardless of seller's currency
- Violates multi-currency support
- Confuses sellers in other currencies

**Should Be**:
```tsx
toast({
  title: "Withdrawal Requested",
  description: `Your withdrawal of ${sellerCurrency} ${amount.toLocaleString()} is being processed`
});
```

---

### 5. **ANALYTICS MISSING CURRENCY CONTEXT IN CALCULATIONS** (Medium)

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L67-120)

**Problem**:
- Revenue calculations fetch price_at_purchase from order_items
- But order_items.currency field is NOT being queried
- Can't determine if price is in different currency than expected
- May cause incorrect revenue aggregation when orders are in different currencies

**Current Query**:
```tsx
const { data: orderItems } = await supabase
  .from("order_items")
  .select(`
    price_at_purchase,
    quantity,
    created_at,
    products!inner(id, title, category),
    orders!inner(created_at)
  `)
  .eq("seller_id", user.id)
  .gte("orders.created_at", sixMonthsAgo.toISOString());
```

**Missing**:
- `currency` field from order_items (NOW AVAILABLE in DB)
- `currency` field from orders (NOW AVAILABLE in DB)

**Impact**: 
- Revenue totals may mix currencies without conversion
- Charts show incorrect totals if seller has international orders

---

### 6. **ANALYTICS SHOWS REVENUE WITHOUT CURRENCY SYMBOL** (High)

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L237-L243)

```tsx
{
  title: "Total Revenue",
  value: formatPrice(stats.totalRevenue, (profile?.currency_preference || 'USD') as Currency),
  icon: DollarSign,
  ...
}
```

**Status**: ✅ CORRECT - Uses formatPrice with currency preference

**But**: The chart visualization (Sales Trend) shows Y-axis values without any formatting:

```tsx
<YAxis className="text-xs" />
```

**Problem**:
- Chart Y-axis shows numbers like "50000" or "100000"
- Users won't know if it's USD, TZS, or other currency
- Tooltip also doesn't show currency symbol

---

### 7. **CATEGORY DISTRIBUTION PERCENTAGE CORRECT BUT UNLABELED** (Low)

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L400-409)

**Status**: ✅ Percentages are correct
**Issue**: 🟡 Shows percentages only, not absolute revenue values

**Current Display**:
```
Clothes (45%)
Electronics (30%)
Home Appliances (25%)
```

**Better Display**:
```
Clothes: 45% ($50,000)
Electronics: 30% ($33,000)
Home Appliances: 25% ($27,500)
```

---

## 🔍 SUMMARY OF ISSUES

| # | Issue | File | Line | Severity | Impact |
|---|-------|------|------|----------|--------|
| 1 | Hardcoded $ in top products | Analytics.tsx | 533 | 🔴 CRITICAL | Wrong currency symbol |
| 2 | Missing currency in top products | Analytics.tsx | 524-539 | 🟡 HIGH | Ambiguous values |
| 3 | Hardcoded TZS in withdrawal label | Earnings.tsx | 154 | 🟡 HIGH | Confusing UX |
| 4 | Hardcoded TZS in toast message | Earnings.tsx | 133 | 🟡 HIGH | Wrong message |
| 5 | Missing currency in analytics query | Analytics.tsx | 70-78 | 🟡 HIGH | Can't track order currencies |
| 6 | Chart Y-axis no currency | Analytics.tsx | 357 | 🟡 HIGH | Ambiguous chart values |
| 7 | Category revenue not shown | Analytics.tsx | 400-409 | 🟠 MEDIUM | Incomplete data |

---

## 💥 BUSINESS IMPACT

### Immediate Issues (User Facing)
1. **Sellers see wrong currency symbols** - Damages trust
2. **Withdrawal form confuses non-TZS sellers** - Support burden
3. **Revenue charts are ambiguous** - Poor decision making
4. **Toast messages misleading** - User confusion

### Data Issues
1. **Revenue calculations don't account for currency** - Wrong totals
2. **Can't track international order currencies** - Audit failure
3. **Financial reports inaccurate** - Compliance risk

---

## 📋 FIX CHECKLIST

### CRITICAL (Fix immediately)
- [ ] Replace hardcoded `$` with `formatPrice()` in top products
- [ ] Add currency symbol to top products revenue display
- [ ] Query currency fields from order_items in analytics
- [ ] Parameterize TZS label in withdrawal form

### HIGH (Fix this week)
- [ ] Fix toast message to use sellerCurrency
- [ ] Add currency labels to chart Y-axis
- [ ] Add currency to tooltip in Sales Trend chart

### MEDIUM (Fix next sprint)
- [ ] Show absolute values in category distribution
- [ ] Add currency validation in withdrawal form
- [ ] Add currency indicators to all earnings tables

---

## 🛠️ CODE FIXES REQUIRED

### Fix #1: Top Products Revenue Display

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L533)

Change:
```tsx
<div className="font-bold">${product.revenue.toFixed(2)}</div>
```

To:
```tsx
<div className="font-bold">
  {formatPrice(product.revenue, profile?.currency_preference || 'USD' as Currency)}
</div>
```

---

### Fix #2: Import formatPrice

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L7)

Change:
```tsx
import { useCurrency, Currency } from "@/hooks/useCurrency";
```

To:
```tsx
import { useCurrency, Currency } from "@/hooks/useCurrency";
import { formatPrice } from "@/lib/currency";
```

---

### Fix #3: Withdrawal Dialog Label

**File**: [src/pages/seller/Earnings.tsx](src/pages/seller/Earnings.tsx#L154)

Change:
```tsx
<Label htmlFor="amount">Amount (TZS)</Label>
```

To:
```tsx
<Label htmlFor="amount">Amount ({sellerCurrency})</Label>
```

---

### Fix #4: Withdrawal Toast Message

**File**: [src/pages/seller/Earnings.tsx](src/pages/seller/Earnings.tsx#L133)

Change:
```tsx
toast({
  title: "Withdrawal Requested",
  description: `Your withdrawal of TZS ${amount.toLocaleString()} is being processed`
});
```

To:
```tsx
toast({
  title: "Withdrawal Requested",
  description: `Your withdrawal of ${sellerCurrency} ${amount.toLocaleString()} is being processed`
});
```

---

### Fix #5: Analytics Query - Include Currency

**File**: [src/pages/seller/Analytics.tsx](src/pages/seller/Analytics.tsx#L70-78)

Change:
```tsx
const { data: orderItems } = await supabase
  .from("order_items")
  .select(`
    price_at_purchase,
    quantity,
    created_at,
    products!inner(id, title, category),
    orders!inner(created_at)
  `)
```

To:
```tsx
const { data: orderItems } = await supabase
  .from("order_items")
  .select(`
    price_at_purchase,
    quantity,
    currency,
    created_at,
    products!inner(id, title, category),
    orders!inner(created_at, currency)
  `)
```

---

## 🧪 TEST CASES

### Test 1: EUR Seller Analytics
1. Switch seller profile currency to EUR
2. Navigate to Analytics
3. Verify: All revenue displays show EUR symbol, not $

### Test 2: TZS Seller Withdrawal
1. Switch seller profile currency to TZS
2. Click "Withdraw" button
3. Verify: Label shows "Amount (TZS)", not hardcoded

### Test 3: Mixed Currency Orders
1. Create order items in USD and TZS
2. View analytics revenue
3. Verify: Totals account for currency differences (may need conversion)

### Test 4: Top Products Display
1. Sell products in different currencies
2. View top products list
3. Verify: Each shows correct currency symbol and amount

---

## 📚 RELATED DOCUMENTATION

- [DATABASE_FIXES_COMPLETE.md](DATABASE_FIXES_COMPLETE.md) - Database changes applied
- [APPLICATION_CODE_CHANGES_NEEDED.md](APPLICATION_CODE_CHANGES_NEEDED.md) - All frontend changes
- [CURRENCY_IMPLEMENTATION_ANALYSIS.md](CURRENCY_IMPLEMENTATION_ANALYSIS.md) - Full currency system analysis

---

## 🎯 NEXT STEPS

1. **Review this analysis** - Confirm issues match expectations
2. **Implement fixes** - Apply code changes from Fix Checklist
3. **Test thoroughly** - Use Test Cases above
4. **Deploy** - Push to production with currency fixes
5. **Monitor** - Check for any customer confusion

---

**Priority**: 🔴 HIGH  
**Effort**: ~2-3 hours to fix all issues  
**Risk**: Low (display fixes, no data migration needed)
