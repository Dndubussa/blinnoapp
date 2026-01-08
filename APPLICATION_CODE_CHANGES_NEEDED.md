# 📝 APPLICATION CODE CHANGES REQUIRED

**Status**: Database fixes complete ✅  
**Next**: Update application code to use currency fields  
**Estimated Effort**: 3-4 hours

---

## 1. CHECKOUT FLOW (HIGH PRIORITY)

### File: `src/pages/Checkout.tsx`

**Current Issue**: Order created without currency information

**Fix Required**:
```typescript
// When creating order, add currency
const createOrder = async (shippingData: ShippingFormData) => {
  // Determine order currency
  const orderCurrency = 'TZS'; // Use actual user's transaction currency
  // Could be: userCurrency, or mixed currency handling
  
  const { data: order, error } = await supabase
    .from('orders')
    .insert([
      {
        buyer_id: user!.id,
        total_amount: totalPrice,
        currency: orderCurrency,  // ← ADD THIS
        shipping_address: { ... },
        status: 'pending',
      }
    ]);
};
```

---

## 2. ORDER ITEM CREATION (HIGH PRIORITY)

### File: `src/pages/Checkout.tsx` or order creation service

**Current Issue**: Order items created without currency

**Fix Required**:
```typescript
// When adding items to order
const createOrderItems = async (orderId: string) => {
  const orderItems = items.map(item => ({
    order_id: orderId,
    product_id: item.id,
    seller_id: item.seller_id,
    quantity: item.quantity,
    price_at_purchase: item.price,
    currency: item.currency || 'TZS',  // ← ADD THIS (from product)
  }));
  
  await supabase
    .from('order_items')
    .insert(orderItems);
};
```

---

## 3. ORDER DISPLAY - BUYER (MEDIUM PRIORITY)

### File: `src/pages/buyer/Orders.tsx`

**Current Issue**: 
```typescript
// Inferring currency from first product (unreliable)
const currency = (firstItem?.products?.currency || 'USD') as Currency;
formatPrice(Number(order.total_amount), currency)
```

**Fix Required**:
```typescript
// Use order's own currency field
import { Currency } from '@/lib/currency';

const { formatPrice } = useCurrency();

// Now simply:
<p className="text-lg font-bold">
  {formatPrice(Number(order.total_amount), order.currency as Currency)}
</p>
```

---

## 4. ORDER DISPLAY - SELLER (MEDIUM PRIORITY)

### File: `src/pages/seller/Orders.tsx`

**Current Issue**: Using product currency for order item display

**Fix Required**:
```typescript
// Use order_item's currency instead of product's
formatPriceWithConversion(
  item.price_at_purchase * item.quantity,
  item.currency as Currency,  // ← Use this (from order_item table)
  // item.products?.currency  // ← Don't use this
  sellerCurrency
)
```

---

## 5. SELLER EARNINGS CALCULATION (HIGH PRIORITY)

### File: Edge Function or backend service for earnings

**Current Issue**: Earnings calculated without currency tracking

**Fix Required**:
```typescript
// When calculating earnings from order items
const earning = {
  seller_id: seller_id,
  order_id: order_id,
  order_item_id: order_item_id,
  amount: itemPrice * quantity,
  currency: orderItem.currency,  // ← ADD THIS
  platform_fee: fee,
  net_amount: (itemPrice * quantity) - fee,
  status: 'pending',
};

await supabase.from('seller_earnings').insert(earning);
```

---

## 6. SELLER EARNINGS DISPLAY (MEDIUM PRIORITY)

### File: `src/pages/seller/Earnings.tsx`

**Current Code**:
```typescript
// Earnings displayed in seller's preferred currency
const formatCurrency = (amount: number) => {
  return formatPriceUtil(amount, sellerCurrency);
};
```

**Update to**:
```typescript
// Earnings may be in different currencies - show both
const formatEarning = (earning: SellerEarning) => {
  const originalAmount = formatPrice(earning.amount, earning.currency);
  const convertedAmount = formatPrice(
    convertCurrency(earning.amount, earning.currency, sellerCurrency),
    sellerCurrency
  );
  
  if (earning.currency === sellerCurrency) {
    return originalAmount;
  }
  return `${originalAmount} (${convertedAmount})`;
};
```

---

## 7. WITHDRAWAL PROCESSING (HIGH PRIORITY)

### File: Withdrawal request form or service

**Current Issue**: Withdrawal form hardcoded to TZS

**Fix Required**:
```typescript
// In withdrawal form
const sellerCurrency = profile?.currency_preference || 'USD';

// Form should show:
<Label htmlFor="amount">Amount ({sellerCurrency})</Label>

// When submitting:
const withdrawal = {
  seller_id: user.id,
  amount: parseFloat(withdrawAmount),
  currency: sellerCurrency,  // ← ADD THIS
  net_amount: parseFloat(withdrawAmount) * 0.98,
  fee: parseFloat(withdrawAmount) * 0.02,
  payment_method: paymentMethod,
  phone_number: phoneNumber,
  status: 'pending',
};

await supabase.from('withdrawal_requests').insert(withdrawal);
```

---

## 8. ORDER TRACKING PAGE (MEDIUM PRIORITY)

### File: `src/pages/OrderTracking.tsx`

**Current Code**:
```typescript
const { formatPrice } = useCurrency();

// Displays total using user's currency
<span>{formatPrice(order.total_amount)}</span>
```

**Fix Required**:
```typescript
const { formatPrice } = useCurrency();

// Use order's actual currency
<span>
  {formatPrice(
    Number(order.total_amount), 
    order.currency as Currency
  )}
</span>
```

---

## 9. PAYMENT PROCESSING (MEDIUM PRIORITY)

### File: `src/pages/Checkout.tsx`

**Current Code**:
```typescript
const formatPriceTZS = (price: number) => {
  const tzsAmount = price * 2500;  // Hardcoded conversion
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
  }).format(tzsAmount);
};
```

**Fix Required**:
```typescript
import { convertCurrency, formatPrice as formatPriceUtil } from '@/lib/currency';

const formatPaymentAmount = (amount: number, fromCurrency: Currency) => {
  // Assume payments are always in TZS (for now)
  const paymentCurrency: Currency = 'TZS';
  
  const tzsAmount = convertCurrency(amount, fromCurrency, paymentCurrency);
  
  return formatPriceUtil(tzsAmount, paymentCurrency);
};

// Use in payment:
const paymentAmount = formatPaymentAmount(totalPrice, userCurrency);
```

---

## 10. SUPABASE TYPES UPDATE (LOW PRIORITY)

### File: `src/integrations/supabase/types.ts` (auto-generated)

**Action**: Regenerate types after migrations are applied

```bash
npm run generate:types
```

This will automatically add the new currency columns to the TypeScript type definitions.

---

## 11. REACT QUERY UPDATES (MEDIUM PRIORITY)

### Files: Components using `useQuery` for orders/earnings

**Example Update**:
```typescript
// OLD
const { data: orders } = useQuery({
  queryKey: ["buyer-orders", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(id, title, category, currency))")
      .eq("buyer_id", user?.id);
    return data;
  }
});

// NEW - Select currency from orders directly
const { data: orders } = useQuery({
  queryKey: ["buyer-orders", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(id, title, category))")
      .eq("buyer_id", user?.id);
    return data;
  }
});
```

---

## 12. TEST UPDATES (MEDIUM PRIORITY)

### Files: `src/__tests__/**/*.test.ts`

**Add test cases for**:
```typescript
// Test that orders have currency
describe('Order Creation', () => {
  it('should create order with currency field', async () => {
    const order = await createOrder({
      buyer_id: userId,
      total_amount: 5000,
      currency: 'TZS',
      // ...
    });
    
    expect(order.currency).toBe('TZS');
  });
  
  it('should enforce valid currency values', async () => {
    expect(async () => {
      await createOrder({
        buyer_id: userId,
        total_amount: 5000,
        currency: 'INVALID',  // Should fail
      });
    }).toThrow();
  });
});

// Test order item currency
describe('Order Items', () => {
  it('should store item currency', async () => {
    const item = await createOrderItem({
      order_id: orderId,
      product_id: productId,
      quantity: 1,
      price_at_purchase: 50,
      currency: 'EUR',
    });
    
    expect(item.currency).toBe('EUR');
  });
});

// Test seller earnings currency
describe('Seller Earnings', () => {
  it('should track earnings in original currency', async () => {
    const earning = await createEarning({
      seller_id: sellerId,
      amount: 5000,
      currency: 'KES',
    });
    
    expect(earning.currency).toBe('KES');
  });
});
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Update Checkout page to save order currency
- [ ] Update order item creation to use product currency
- [ ] Update buyer order display to use order.currency
- [ ] Update seller order display to use order_item.currency
- [ ] Update seller earnings calculation to save currency
- [ ] Update seller earnings display
- [ ] Update withdrawal form to show seller's currency
- [ ] Update withdrawal processing to save currency
- [ ] Update order tracking page
- [ ] Update payment processing logic
- [ ] Regenerate Supabase types
- [ ] Update React Query selections
- [ ] Add test cases for currency fields
- [ ] Test multi-currency scenarios
- [ ] Update API documentation
- [ ] Deploy to staging for testing

---

## PRIORITY ORDER

### Phase 1 (CRITICAL - Week 1)
1. Checkout - save order currency
2. Order item creation - save item currency
3. Earnings calculation - save currency
4. Withdrawal form - use seller currency

### Phase 2 (HIGH - Week 2)
5. Order display pages (buyer & seller)
6. Earnings display
7. Payment processing

### Phase 3 (MEDIUM - Week 3)
8. Test updates
9. API documentation
10. Type regeneration

---

## ESTIMATED EFFORT

| Component | Effort | Notes |
|-----------|--------|-------|
| Checkout/Order Creation | 1-2 hrs | Core functionality |
| Order Item Creation | 0.5 hrs | Straightforward |
| Order Display (Buyer) | 0.5 hrs | Replace currency logic |
| Order Display (Seller) | 0.5 hrs | Replace currency logic |
| Earnings Calculation | 1 hr | New field tracking |
| Earnings Display | 0.5 hrs | Show both currencies |
| Withdrawal Processing | 1 hr | Form + processing |
| Tests | 1-2 hrs | New test cases |
| **Total** | **6-8 hrs** | **With testing & QA** |

---

**Note**: Database fixes are complete. These code changes will unlock the full benefits of the currency tracking system.

Ready to proceed with implementation!
