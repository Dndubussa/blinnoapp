# ClickPesa Checksum Fix - Implementation Complete

**Date**: January 5, 2026  
**Status**: ✅ DEPLOYED

## Problem

The ClickPesa hosted checkout integration was failing with `Invalid checksum` errors:

```
{
  "statusCode": 400,
  "message": ["Invalid checksum"],
  "error": "Bad Request"
}
```

### Root Cause

The `create-hosted-checkout` action was not calculating the checksum required by ClickPesa's API. According to [ClickPesa's documentation](https://docs.clickpesa.com/home/checksum), all requests to certain endpoints require an HMAC-SHA256 checksum for payload integrity validation.

## Solution

Implemented proper checksum calculation following ClickPesa's canonical JSON approach:

### 1. **Canonicalization Function**
```typescript
function canonicalize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  // Recursively sort ALL object keys alphabetically at every nesting level
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = canonicalize(obj[key]);
      return acc;
    }, {});
}
```

**Purpose**: Ensures consistent key ordering regardless of input order, which is critical for checksum matching.

### 2. **HMAC-SHA256 Checksum Generation**
```typescript
async function createPayloadChecksum(checksumKey: string, payload: unknown): Promise<string> {
  // 1. Canonicalize the payload recursively
  const canonicalPayload = canonicalize(payload);
  
  // 2. Serialize to compact JSON (no whitespace)
  const payloadString = JSON.stringify(canonicalPayload);
  
  // 3. Import checksum key for Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', 
    encoder.encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 4. Generate HMAC-SHA256 signature
  const signature = await crypto.subtle.sign('HMAC', key, 
    encoder.encode(payloadString)
  );
  
  // 5. Convert to hexadecimal string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 3. **Updated Hosted Checkout Function**

The `createHostedCheckout()` function now:

1. **Retrieves the checksum secret** from environment variable `CLICKPESA_CHECKSUM_SECRET`
2. **Builds the payload** with amount, currency, reference, description, and optional redirect/webhook URLs
3. **Generates the checksum** using the canonical JSON method
4. **Includes the checksum** in the final request to ClickPesa
5. **Sends to the correct endpoint**: `https://api.clickpesa.com/third-parties/checkout-link/generate-checkout-url`

```typescript
// Payload structure sent to ClickPesa:
{
  "amount": 750,
  "currency": "TZS",
  "reference": "ORDER01CCD6321767604295009",
  "description": "Blinno Order Payment - 1 item(s)",
  "redirect_url": "https://www.blinno.app/checkout/success?...",
  "webhook_url": "https://..../clickpesa-webhook",
  "checksum": "2e55194f82ddd0a2edde51f336c8d07287ef5abf15930d59ec6a9a3afe50c077"
}
```

## Files Modified

- **[supabase/functions/clickpesa-payment/index.ts](supabase/functions/clickpesa-payment/index.ts)**
  - Added `canonicalize()` function
  - Added `createPayloadChecksum()` async function
  - Updated `createHostedCheckout()` function
  - Updated `create-hosted-checkout` case handler

## Deployment

✅ **Function deployed** with version 33
- **Status**: ACTIVE
- **Endpoint**: `https://your-project.supabase.co/functions/v1/clickpesa-payment`
- **Method**: POST
- **Action**: `create-hosted-checkout`

## Environment Variables Required

Ensure these are set in your Supabase project:

```
CLICKPESA_CLIENT_ID           # Your ClickPesa client ID
CLICKPESA_API_KEY              # Your ClickPesa API key
CLICKPESA_CHECKSUM_SECRET      # Your ClickPesa checksum secret (NEW)
```

**Important**: After setting the checksum secret, you may need to regenerate API tokens in ClickPesa dashboard.

## Testing the Fix

### Test Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/clickpesa-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "action": "create-hosted-checkout",
    "amount": 750,
    "currency": "TZS",
    "reference": "ORDER-TEST-12345",
    "description": "Test Payment",
    "redirect_url": "https://www.blinno.app/checkout/success",
    "order_id": "test-order-id"
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "data": {
    "checkout_id": "...",
    "checkout_url": "https://pay.clickpesa.com/...",
    "payment_url": "https://pay.clickpesa.com/..."
  },
  "checkout_url": "https://pay.clickpesa.com/..."
}
```

## Logging

The function includes detailed logging for debugging:

```
[DEBUG] Canonical payload string: {"amount":750,"currency":"TZS",...}
[DEBUG] Checksum key length: 64
[DEBUG] Generated checksum: 2e55194f82ddd0a2edde51f336c8d07287ef5abf15930d59ec6a9a3afe50c077
[DEBUG] Final payload being sent: {...}
[DEBUG] ClickPesa response status: 200
[DEBUG] ClickPesa response: {checkout_id: "...", checkout_url: "..."}
```

## References

- **ClickPesa Checksum Documentation**: https://docs.clickpesa.com/home/checksum
- **ClickPesa Demo Repository**: https://github.com/ClickPesa/clickpesa-api-checksum-demo
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

## Key Implementation Details

| Aspect | Detail |
|--------|--------|
| **Algorithm** | HMAC-SHA256 |
| **Serialization** | Canonical JSON (keys sorted alphabetically at all nesting levels) |
| **Encoding** | UTF-8 for both key and message |
| **Output Format** | Hexadecimal (64 characters) |
| **Payload Integrity** | ✅ Checksum validates data hasn't been tampered with |
| **Cross-Language Compatible** | ✅ Works with JavaScript, Python, PHP, Go, Java implementations |

## Future Enhancements

1. **Cache checksum secret** at function startup to avoid environment lookups
2. **Add request signature validation** for webhook responses from ClickPesa
3. **Implement checksum validation** for incoming webhook payloads
4. **Add metrics** for checksum generation performance
5. **Support legacy checksum method** if needed for backwards compatibility

---

**Status**: Ready for production use. The hosted checkout flow should now work without "Invalid checksum" errors.
