import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS configuration
const ALLOWED_ORIGINS = [
  "https://www.blinno.app",
  "https://blinno.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin?: string | null): Record<string, string> {
  let allowedOrigin = ALLOWED_ORIGINS[0];
  
  if (origin && typeof origin === "string") {
    const normalizedOrigin = origin.trim().toLowerCase();
    const isAllowed = ALLOWED_ORIGINS.some(
      (allowed) => allowed.toLowerCase() === normalizedOrigin
    );
    
    if (isAllowed) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const corsHeaders = getCorsHeaders();

interface GeneratePreviewRequest {
  sourceFileUrl: string;
  sourceType: "audio" | "video";
  startTime: number;
  duration: number;
  productId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GeneratePreviewRequest = await req.json();
    const { sourceFileUrl, sourceType, startTime, duration, productId } = body;

    if (!sourceFileUrl || !sourceType || startTime < 0 || duration <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract file path from sourceFileUrl
    // Source URL format: https://supabase.co/storage/v1/object/public/product-files/userId/file.ext
    // or: https://supabase.co/storage/v1/object/sign/product-files/userId/file.ext
    let sourceFilePath = "";
    try {
      const url = new URL(sourceFileUrl);
      // Extract path from URL (remove /storage/v1/object/public/ or /storage/v1/object/sign/)
      const pathMatch = url.pathname.match(/\/(product-files|product-previews)\/(.+)$/);
      if (pathMatch) {
        sourceFilePath = pathMatch[2];
      }
    } catch (e) {
      console.error("Error parsing source file URL:", e);
    }

    // For now, we'll use the source file URL for preview
    // In the future, this can be enhanced to actually extract the segment using ffmpeg
    // and upload to product-previews bucket
    
    // Generate preview URL (for now, same as source, but will be extracted preview in future)
    let previewUrl = sourceFileUrl;
    
    // TODO: Future enhancement - Extract 30-second segment and upload to product-previews bucket
    // const previewFilePath = `${user.id}/preview-${Date.now()}.${sourceType === 'audio' ? 'mp3' : 'mp4'}`;
    // ... extract segment using ffmpeg ...
    // ... upload to product-previews bucket ...
    // previewUrl = getPublicUrl('product-previews', previewFilePath);
    
    // Store preview configuration in product attributes if productId is provided
    if (productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("attributes, seller_id")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user owns the product
      if (product.seller_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: You don't own this product" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update product attributes with preview configuration
      const updatedAttributes = {
        ...(product.attributes || {}),
        previewStartTime: startTime,
        previewDuration: duration,
        previewFile: previewUrl, // Preview URL (currently source file, will be extracted preview in future)
      };

      const { error: updateError } = await supabase
        .from("products")
        .update({ attributes: updatedAttributes })
        .eq("id", productId);

      if (updateError) {
        console.error("Error updating product:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update product" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return preview configuration
    // Note: In production, you would extract the actual 30-second segment here
    // using ffmpeg or a media processing service
    return new Response(
      JSON.stringify({
        previewUrl: previewUrl, // Preview URL (currently source file, will be extracted preview in future)
        previewStartTime: startTime,
        previewDuration: duration,
        message: "Preview configured. Client-side playback will be limited to the selected segment.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating preview:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

