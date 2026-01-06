import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  "https://www.blinno.app",
  "https://blinno.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin?: string | null, methods: string = "POST, OPTIONS"): Record<string, string> {
  let allowedOrigin = ALLOWED_ORIGINS[0];
  if (origin && typeof origin === "string") {
    const normalizedOrigin = origin.trim().toLowerCase();
    const isAllowed = ALLOWED_ORIGINS.some((allowed) => allowed.toLowerCase() === normalizedOrigin);
    if (isAllowed) allowedOrigin = origin;
  }
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Max-Age": "86400",
  };
}
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

interface PaymentRequest {
  amount: number;
  currency: string;
  phone_number: string;
  network: "MPESA" | "TIGOPESA" | "AIRTELMONEY" | "HALOPESA";
  reference: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
}

let cachedToken: string = "";
let tokenExpiry: number = 0;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && tokenExpiry > now + 300000) {
    console.log("[DEBUG] Using cached ClickPesa token");
    return cachedToken;
  }

  const clientId = Deno.env.get("CLICKPESA_CLIENT_ID");
  const apiKey = Deno.env.get("CLICKPESA_API_KEY");

  console.log("[DEBUG] Environment check:", {
    hasClientId: !!clientId,
    hasApiKey: !!apiKey,
    clientIdLength: clientId?.length || 0,
    apiKeyLength: apiKey?.length || 0
  });

  if (!clientId || !apiKey) {
    console.error("[ERROR] Missing ClickPesa credentials:", {
      hasClientId: !!clientId,
      hasApiKey: !!apiKey
    });
    throw new Error("ClickPesa credentials not configured. Please check environment variables CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY");
  }

  console.log("Generating new ClickPesa auth token...");

  const response = await fetch("https://api.clickpesa.com/third-parties/generate-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "client-id": clientId,
      "api-key": apiKey,
    },
  });

  console.log("[DEBUG] ClickPesa auth response status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error("[ERROR] ClickPesa auth error:", error);
    throw new Error(`Failed to authenticate with ClickPesa: ${error}`);
  }

  const data = await response.json();
  console.log("[DEBUG] ClickPesa auth response:", { success: data.success, hasToken: !!data.token });
  
  if (!data.success || !data.token) {
    console.error("[ERROR] Invalid ClickPesa auth response:", data);
    throw new Error("Invalid response from ClickPesa auth");
  }

  cachedToken = data.token;
  tokenExpiry = now + 3600000; // Token valid for 1 hour

  console.log("ClickPesa auth token generated successfully");
  return cachedToken;
}

/**
 * Step 1: Preview/Validate USSD-PUSH Request
 * Validates payment details and verifies payment method availability
 */
async function validatePayment(token: string, payload: PaymentRequest) {
  console.log("Validating ClickPesa payment details...", { 
    amount: payload.amount, 
    network: payload.network,
    reference: payload.reference 
  });

  const response = await fetch("https://api.clickpesa.com/third-parties/ussd-push/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify({
      amount: payload.amount,
      currency: payload.currency || "TZS",
      phone_number: payload.phone_number,
      network: payload.network,
      reference: payload.reference,
      description: payload.description,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("ClickPesa validation error:", error);
    throw new Error(`Payment validation failed: ${error}`);
  }

  return await response.json();
}

/**
 * Step 2: Initiate USSD-PUSH Request
 * Sends the USSD-PUSH request to customer's mobile device
 */
async function initiatePayment(token: string, payload: PaymentRequest) {
  console.log("Initiating ClickPesa USSD-PUSH payment...", { 
    amount: payload.amount, 
    network: payload.network,
    reference: payload.reference 
  });

  const response = await fetch("https://api.clickpesa.com/third-parties/ussd-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify({
      amount: payload.amount,
      currency: payload.currency || "TZS",
      phone_number: payload.phone_number,
      network: payload.network,
      reference: payload.reference,
      description: payload.description,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("ClickPesa payment initiation error:", error);
    throw new Error(`Payment initiation failed: ${error}`);
  }

  return await response.json();
}

/**
 * Canonicalize object for checksum generation
 * Recursively sorts all object keys alphabetically at every nesting level
 */
function canonicalize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const typed = obj as Record<string, unknown>;
  return Object.keys(typed)
    .sort()
    .reduce((acc, key) => {
      acc[key] = canonicalize(typed[key]);
      return acc;
    }, {} as Record<string, unknown>);
}

/**
 * Generate HMAC-SHA256 checksum using canonical JSON
 * Following ClickPesa's official checksum generation method
 */
async function createPayloadChecksum(checksumKey: string, payload: unknown): Promise<string> {
  // Canonicalize the payload recursively for consistent ordering
  const canonicalPayload = canonicalize(payload);
  // Serialize the canonical payload to JSON (compact, no whitespace)
  const payloadString = JSON.stringify(canonicalPayload);
  
  console.log("[DEBUG] Canonical payload string:", payloadString);
  console.log("[DEBUG] Checksum key length:", checksumKey.length);
  
  // Create HMAC-SHA256 using Web Crypto API (available in Deno)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(checksumKey);
  const messageData = encoder.encode(payloadString);
  
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log("[DEBUG] Generated checksum:", hashHex);
    return hashHex;
  } catch (error) {
    console.error("[ERROR] Checksum generation failed:", error);
    throw error;
  }
}

/**
 * Create Hosted Checkout Link
 * Generates a payment link that redirects customer to ClickPesa checkout page
 * Includes checksum for request integrity validation
 */
async function createHostedCheckout(token: string, payload: {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  redirect_url?: string;
  webhook_url?: string;
  checksum_secret?: string;
  customer_email?: string;
  customer_phone?: string;
}) {
  console.log("Creating ClickPesa hosted checkout link...", { 
    amount: payload.amount, 
    reference: payload.reference 
  });

  // Get checksum secret from environment
  const checksumSecret = payload.checksum_secret || Deno.env.get("CLICKPESA_CHECKSUM_SECRET");
  if (!checksumSecret) {
    console.error("[ERROR] Missing CLICKPESA_CHECKSUM_SECRET environment variable");
    throw new Error("Checksum secret not configured");
  }

  // Build checkout payload with ClickPesa API expected field names
  // This payload is used for checksum calculation
  const checkoutPayload: Record<string, unknown> = {
    totalPrice: payload.amount,
    orderReference: payload.reference,
    orderCurrency: payload.currency || "TZS",
    customerEmail: payload.customer_email || "",
    customerPhone: payload.customer_phone || "",
    description: payload.description,
  };

  console.log("[DEBUG] Request payload before checksum:", JSON.stringify(checkoutPayload, null, 2));

  // Generate checksum if secret is available
  let finalPayload: Record<string, unknown> = checkoutPayload;
  if (checksumSecret) {
    try {
      console.log("Using checksum secret for HMAC-SHA256 calculation...");
      const checksum = await createPayloadChecksum(checksumSecret, checkoutPayload);
      console.log("[DEBUG] Generated checksum:", checksum);
      finalPayload = {
        ...checkoutPayload,
        checksum: checksum,
      };
    } catch (checksumError) {
      console.error("[ERROR] Failed to generate checksum:", checksumError);
      throw checksumError;
    }
  }

  console.log("[DEBUG] Final request body:", JSON.stringify(finalPayload, null, 2));

  const response = await fetch("https://api.clickpesa.com/third-parties/checkout-link/generate-checkout-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify(finalPayload),
  });

  console.log("[DEBUG] ClickPesa response status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error("[ERROR] ClickPesa hosted checkout error:", error);
    throw new Error(`Hosted checkout creation failed with status ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log("[DEBUG] ClickPesa response:", JSON.stringify(result, null, 2));
  
  return result;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin, "POST, OPTIONS");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header for payment request");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Invalid token or user not found:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payment request from authenticated user: ${user.id}`);

    const { action, ...payload } = await req.json();

    console.log("ClickPesa payment action:", action);
    console.log("Payment payload received:", JSON.stringify(payload, null, 2));

    switch (action) {
      case "validate": {
        // Step 1: Validate payment details (Preview USSD-PUSH Request)
        try {
          // Validate required fields
          if (!payload.amount || !payload.phone_number || !payload.network || !payload.reference) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Missing required payment fields: amount, phone_number, network, or reference" 
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const clickpesaToken = await getAuthToken();
          const result = await validatePayment(clickpesaToken, payload as PaymentRequest);
          
          return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (validationError: unknown) {
          const errorMessage = validationError instanceof Error ? validationError.message : "Unknown validation error";
          console.error("Payment validation error:", errorMessage);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessage,
              details: validationError instanceof Error ? validationError.stack : undefined
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "initiate": {
        // Step 2: Initiate USSD-PUSH Request
        try {
          // Validate required fields with detailed logging
          const missingFields: string[] = [];
          if (!payload.amount && payload.amount !== 0) missingFields.push("amount");
          if (!payload.phone_number) missingFields.push("phone_number");
          if (!payload.network) missingFields.push("network");
          if (!payload.reference) missingFields.push("reference");

          if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            console.error("Payload received:", JSON.stringify(payload, null, 2));
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Missing required payment fields: ${missingFields.join(", ")}`,
                message: `Missing required payment fields: ${missingFields.join(", ")}`,
                received: payload
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Validate amount is a positive number
          const amount = Number(payload.amount);
          if (isNaN(amount) || amount <= 0) {
            console.error("Invalid amount:", payload.amount, "Type:", typeof payload.amount);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Invalid amount: ${payload.amount}. Amount must be a positive number`,
                message: `Invalid amount: ${payload.amount}. Amount must be a positive number`
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Validate phone number format (should be 12 digits starting with 255)
          const phoneNumber = String(payload.phone_number).trim();
          if (!/^255\d{9}$/.test(phoneNumber)) {
            console.error("Invalid phone number format:", phoneNumber);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Invalid phone number format: ${phoneNumber}. Expected format: 255XXXXXXXXX (12 digits)`,
                message: `Invalid phone number format. Expected format: 255XXXXXXXXX (12 digits)`
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Validate network (must be one of the allowed values)
          const validNetworks = ["MPESA", "TIGOPESA", "AIRTELMONEY", "HALOPESA"];
          const network = String(payload.network).toUpperCase().trim();
          if (!validNetworks.includes(network)) {
            console.error("Invalid network:", payload.network);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Invalid network: ${payload.network}. Must be one of: ${validNetworks.join(", ")}`,
                message: `Invalid network. Must be one of: ${validNetworks.join(", ")}`
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Normalize payload
          const normalizedPayload: PaymentRequest = {
            amount: amount,
            currency: payload.currency || "TZS",
            phone_number: phoneNumber,
            network: network as PaymentRequest["network"],
            reference: String(payload.reference).trim(),
            description: payload.description || "",
            order_id: payload.order_id || undefined,
          };

          console.log("Normalized payment payload:", JSON.stringify(normalizedPayload, null, 2));

          const clickpesaToken = await getAuthToken();
          
          // First validate, then initiate
          try {
            await validatePayment(clickpesaToken, normalizedPayload);
            console.log("Payment validation successful, proceeding with initiation...");
          } catch (validationError) {
            console.warn("Validation failed, but proceeding with initiation:", validationError);
            // Some implementations may skip validation, so we continue
          }
          
          const result = await initiatePayment(clickpesaToken, normalizedPayload);
          
          // Store the transaction in the database (non-blocking)
          try {
            const { error: txError } = await supabase
              .from("payment_transactions")
              .insert({
                user_id: user.id,
                order_id: normalizedPayload.order_id || null,
                subscription_id: normalizedPayload.subscription_id || null,
                amount: normalizedPayload.amount,
                currency: normalizedPayload.currency,
                network: normalizedPayload.network,
                phone_number: normalizedPayload.phone_number,
                reference: normalizedPayload.reference,
                clickpesa_reference: result.transaction_id || result.reference || null,
                status: "pending",
                description: normalizedPayload.description,
              });

            if (txError) {
              console.error("Error storing transaction (non-critical):", txError);
              // Don't fail the payment if transaction storage fails
            }
          } catch (dbError) {
            console.error("Database error (non-critical):", dbError);
            // Continue even if database insert fails
          }
          
          return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (paymentError: unknown) {
          const errorMessage = paymentError instanceof Error ? paymentError.message : "Unknown payment error";
          console.error("Payment initiation error:", errorMessage);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessage,
              details: paymentError instanceof Error ? paymentError.stack : undefined
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "check-status": {
        // Step 3: Check Payment Status
        try {
          const clickpesaToken = await getAuthToken();
          const { transaction_id, reference } = payload;

          if (!transaction_id && !reference) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Missing required field: transaction_id or reference" 
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Use transaction_id if provided, otherwise try to find it from reference
          let transactionId = transaction_id;
          if (!transactionId && reference) {
            const { data: txData } = await supabase
              .from("payment_transactions")
              .select("clickpesa_reference")
              .eq("reference", reference)
              .eq("user_id", user.id)
              .single();
            
            if (txData?.clickpesa_reference) {
              transactionId = txData.clickpesa_reference;
            }
          }

          if (!transactionId) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Transaction ID not found" 
              }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const response = await fetch(
            `https://api.clickpesa.com/third-parties/transactions/${transactionId}`,
            {
              headers: {
                "Authorization": clickpesaToken,
              },
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error("ClickPesa status check error:", error);
            throw new Error(`Failed to check payment status: ${error}`);
          }

          const result = await response.json();
          
          // Update transaction status in database if reference provided
          if (reference && result.status) {
            const newStatus = result.status === "COMPLETED" ? "completed" 
              : result.status === "FAILED" ? "failed" 
              : result.status === "CANCELLED" ? "cancelled" 
              : "processing";

            const { error: updateError } = await supabase
              .from("payment_transactions")
              .update({ 
                status: newStatus,
                clickpesa_reference: transactionId,
              })
              .eq("reference", reference)
              .eq("user_id", user.id);

            if (updateError) {
              console.error("Error updating transaction status:", updateError);
            }

            // If payment completed, update order status
            if (newStatus === "completed") {
              const { data: txData } = await supabase
                .from("payment_transactions")
                .select("order_id")
                .eq("reference", reference)
                .single();

              if (txData?.order_id) {
                await supabase
                  .from("orders")
                  .update({ status: "confirmed" })
                  .eq("id", txData.order_id);
              }
            }
          }

          return new Response(JSON.stringify({ success: true, data: result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (statusError: unknown) {
          const errorMessage = statusError instanceof Error ? statusError.message : "Unknown status check error";
          console.error("Payment status check error:", errorMessage);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessage,
              details: statusError instanceof Error ? statusError.stack : undefined
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "create-hosted-checkout": {
        // Create hosted checkout link
        try {
          console.log("[DEBUG] Starting hosted checkout creation...");
          console.log("[DEBUG] Payload validation - amount:", payload.amount, "reference:", payload.reference);
          
          // Validate required fields
          if (!payload.amount || !payload.reference) {
            console.error("[ERROR] Missing required fields:", { amount: payload.amount, reference: payload.reference });
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Missing required fields: amount or reference" 
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Validate amount
          const amount = Number(payload.amount);
          console.log("[DEBUG] Parsed amount:", amount, "Type:", typeof amount);
          
          if (isNaN(amount) || amount <= 0) {
            console.error("[ERROR] Invalid amount:", payload.amount);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Invalid amount: ${payload.amount}. Amount must be a positive number` 
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log("[DEBUG] Getting ClickPesa auth token...");
          const clickpesaToken = await getAuthToken();
          console.log("[DEBUG] Auth token obtained successfully");
          
          const checkoutPayload = {
            amount: amount,
            currency: payload.currency || "TZS",
            reference: String(payload.reference).trim(),
            description: payload.description || "Blinno Payment",
            redirect_url: payload.redirect_url,
            webhook_url: payload.webhook_url || `${supabaseUrl}/functions/v1/clickpesa-webhook`,
            checksum_secret: Deno.env.get("CLICKPESA_CHECKSUM_SECRET"),
            customer_email: payload.customer_email || "",
            customer_phone: payload.customer_phone || "",
          
          // Store the transaction in the database (non-blocking)
          try {
            const { error: txError } = await supabase
              .from("payment_transactions")
              .insert({
                user_id: user.id,
                order_id: payload.order_id || null,
                subscription_id: payload.subscription_id || null,
                amount: amount,
                currency: payload.currency || "TZS",
                network: null, // Not applicable for hosted checkout
                phone_number: null, // Collected by ClickPesa
                reference: payload.reference,
                clickpesa_reference: result.checkout_id || result.reference || null,
                status: "pending",
                description: payload.description || "Blinno Payment",
              });

            if (txError) {
              console.error("Error storing transaction (non-critical):", txError);
            } else {
              console.log("[DEBUG] Transaction stored successfully");
            }
          } catch (dbError) {
            console.error("Database error (non-critical):", dbError);
          }
          
          console.log("[DEBUG] Returning success response with checkout_url:", result.checkout_url || result.payment_url);
          
          return new Response(JSON.stringify({ 
            success: true, 
            data: result,
            checkout_url: result.checkout_url || result.payment_url
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (checkoutError: unknown) {
          const errorMessage = checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error";
          console.error("[ERROR] Hosted checkout error:", errorMessage);
          console.error("[ERROR] Full error:", checkoutError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessage,
              details: checkoutError instanceof Error ? checkoutError.stack : undefined
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("ClickPesa payment error:", errorMessage, errorStack);
    
    // Check for specific error types
    let statusCode = 500;
    if (errorMessage.includes("credentials not configured") || errorMessage.includes("Unauthorized")) {
      statusCode = 401;
    } else if (errorMessage.includes("Missing required") || errorMessage.includes("Invalid")) {
      statusCode = 400;
    }
    
    // Return error response with proper structure
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: errorMessage, // Also include as 'message' for compatibility
        // Only include stack in development
        ...(Deno.env.get("ENVIRONMENT") === "development" ? { stack: errorStack } : {})
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
