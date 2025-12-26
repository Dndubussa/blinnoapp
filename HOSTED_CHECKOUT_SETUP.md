# ClickPesa Hosted Checkout Integration

## Overview
The platform now supports ClickPesa's hosted checkout feature, allowing customers to complete payments on a secure hosted payment page instead of just USSD push. This provides a better user experience with more payment options.

## How It Works

### 1. Payment Method Selection
During checkout, customers can choose between:
- **Hosted Checkout** (default) - Secure payment page with all payment options
- **Mobile Money USSD** - Direct USSD push to their phone

### 2. Hosted Checkout Flow
1. Customer enters shipping information
2. Customer selects "Hosted Checkout" as payment method
3. Customer clicks "Go to Payment Page"
4. Backend creates a hosted checkout session via ClickPesa API
5. Customer is redirected to ClickPesa's secure payment page
6. Customer completes payment on ClickPesa's page
7. Customer is redirected back to success page with order confirmation

### 3. Return URL Configuration
The return URL is automatically generated and includes:
- Base URL: `https://www.blinno.app` (or `http://localhost:5173` for development)
- Path: `/checkout/success`
- Query parameters:
  - `order_id`: The order ID from the database
  - `reference`: The payment reference (ORDER-XXXXX-timestamp)

**Example Return URL:**
```
https://www.blinno.app/checkout/success?order_id=123e4567-e89b-12d3-a456-426614174000&reference=ORDER-ABC12345-1703688134000
```

## Edge Function Setup

### Updated Action: `create-hosted-checkout`
**New action added to `clickpesa-payment` Edge Function (v18)**

**Request Parameters:**
```typescript
{
  action: "create-hosted-checkout",
  amount: number,              // Amount in TZS (not USD)
  currency: string,            // "TZS" (default)
  reference: string,           // Unique payment reference
  description: string,         // Payment description
  return_url: string,          // URL to redirect after payment
  notify_url?: string,         // Webhook URL for notifications (optional)
  order_id?: string,           // Order ID for tracking
  customer_email?: string,     // Customer email (optional)
  customer_phone?: string      // Customer phone (optional)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    checkout_id: string,
    checkout_url: string,      // URL to redirect customer to
    payment_url: string,       // Alternative checkout URL field
    transaction_id: string     // Transaction ID for tracking
  },
  checkout_url: string         // Also returned at top level for convenience
}
```

### Supported Actions
- `create-hosted-checkout` - Create hosted checkout session (NEW)
- `validate` - Validate payment details
- `initiate` - Initiate USSD push payment
- `check-status` - Check payment status

## Checkout Component Changes

### Payment Method Selection UI
Added radio buttons to select between:
1. **Hosted Checkout** (primary option)
   - Encrypted connection
   - Multiple payment options
   - Instant confirmation

2. **Mobile Money USSD** (secondary option)
   - Select mobile provider (M-Pesa, Tigo Pesa, Airtel Money, Halopesa)
   - Enter phone number
   - Receive USSD prompt

### Payment Processing Logic
```typescript
if (paymentMethod === "hosted_checkout") {
  // Build return URL
  const returnUrl = `${window.location.origin}/checkout/success?order_id=${order.id}&reference=${reference}`;
  
  // Call Edge Function to create hosted checkout
  const result = await supabase.functions.invoke("clickpesa-payment", {
    body: {
      action: "create-hosted-checkout",
      amount: validatedOrderTotalTZS,
      currency: "TZS",
      reference: reference,
      description: `Blinno Order Payment - ${items.length} item(s)`,
      return_url: returnUrl,
      order_id: order.id,
      customer_email: shippingData.email,
      customer_phone: paymentPhone
    }
  });
  
  // Redirect to hosted checkout URL
  window.location.href = result?.checkout_url;
} else if (paymentMethod === "mobile_money") {
  // Existing USSD push flow...
}
```

## Implementation Checklist

- ✅ Edge Function v18 deployed with `create-hosted-checkout` action
- ✅ Checkout UI updated with payment method selection
- ✅ Payment processing logic handles both methods
- ✅ Return URL automatically generated
- ✅ Order ID and reference included in return URL
- ✅ Fallback to USSD push if hosted checkout fails
- ✅ All changes committed to GitHub

## Integration Steps

### 1. Create Checkout Success Page
Create a new page at `src/pages/CheckoutSuccess.tsx`:
```typescript
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const reference = searchParams.get("reference");

  useEffect(() => {
    // Check payment status and confirm order
    if (orderId && reference) {
      checkPaymentStatus();
    } else {
      navigate("/");
    }
  }, [orderId, reference]);

  const checkPaymentStatus = async () => {
    // Call check-status action to verify payment
    const { data } = await supabase.functions.invoke("clickpesa-payment", {
      body: {
        action: "check-status",
        reference: reference
      }
    });

    if (data?.status === "COMPLETED") {
      // Order already confirmed in payment_transactions table
      navigate(`/order/${orderId}`);
    }
  };

  return (
    <div className="text-center p-8">
      <h1>Processing your payment...</h1>
      <p>Please wait while we confirm your order.</p>
    </div>
  );
}
```

### 2. Add Route to Router
In your router configuration:
```typescript
{
  path: "/checkout/success",
  element: <CheckoutSuccess />
}
```

### 3. Set ClickPesa Return URL
In ClickPesa dashboard settings, configure:
- **Return URL:** Leave blank (will be provided per transaction)
- **Webhook URL:** `https://www.blinno.app/api/webhooks/clickpesa` (optional, for notifications)

## Testing

### Test Hosted Checkout Flow
1. Add items to cart
2. Go to checkout
3. Fill in shipping information
4. Select "Hosted Checkout" payment method
5. Click "Go to Payment Page"
6. Should redirect to ClickPesa payment page
7. Use test credentials to complete payment
8. Should redirect back to success page

### Test Mobile Money USSD Flow
1. Add items to cart
2. Go to checkout
3. Fill in shipping information
4. Select "Mobile Money (USSD)" payment method
5. Select mobile provider
6. Enter phone number
7. Click "Pay Now"
8. Should receive USSD prompt on phone

## Database Updates

### payment_transactions Table
New fields added to track payment method:
- `payment_method`: "hosted_checkout" | "ussd_push"

Example record:
```json
{
  "id": "tx_123",
  "user_id": "user_456",
  "order_id": "order_789",
  "amount": 50000,
  "currency": "TZS",
  "reference": "ORDER-ABC12345-1703688134000",
  "clickpesa_reference": "tx_987",
  "status": "pending",
  "payment_method": "hosted_checkout",
  "created_at": "2024-01-01T12:00:00Z"
}
```

## Troubleshooting

### No checkout URL returned
- Check ClickPesa API credentials are set
- Verify `CLICKPESA_CLIENT_ID` and `CLICKPESA_API_KEY` environment variables
- Check Edge Function logs for API errors

### Customer redirected back but payment not confirmed
- Payment status is checked via `check-status` action
- Webhook notifications can be configured for real-time updates
- Manual verification can be done via ClickPesa dashboard

### Return URL not working
- Ensure `VERCEL_URL` environment variable is set for preview deployments
- For custom domains, update return URL pattern in checkout component
- Test with full URLs including protocol (http:// or https://)

## Security Considerations

1. **Return URL Validation:** Ensure return URL is from trusted domain
2. **Order ID Verification:** Verify order belongs to authenticated user
3. **Amount Verification:** Always verify amount in check-status response matches order
4. **CSRF Protection:** Return URL includes unique reference token
5. **Webhook Validation:** When implementing webhooks, validate ClickPesa signature

## Future Enhancements

1. **Webhook Support:** Implement real-time payment notifications
2. **Multiple Currencies:** Support different payment currencies
3. **Saved Payments:** Store customer payment methods for faster checkout
4. **Payment Analytics:** Track payment method usage and success rates
5. **Fallback Handling:** Auto-retry with USSD if hosted checkout fails
