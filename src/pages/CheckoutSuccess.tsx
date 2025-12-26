import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PaymentStatus = "checking" | "completed" | "failed" | "error";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const orderId = searchParams.get("order_id");
  const reference = searchParams.get("reference");
  
  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pollCount, setPollCount] = useState(0);

  // Validate return from payment provider
  useEffect(() => {
    if (!user) {
      setStatus("error");
      setErrorMessage("You must be logged in to view this page");
      return;
    }

    if (!orderId || !reference) {
      setStatus("error");
      setErrorMessage("Invalid return from payment provider. Missing order or reference.");
      return;
    }

    // Start checking payment status
    checkPaymentStatus();
  }, [user, orderId, reference]);

  const checkPaymentStatus = async () => {
    if (!reference || !user) return;

    try {
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!authToken) {
        setStatus("error");
        setErrorMessage("Authentication failed. Please log in again.");
        return;
      }

      // Call check-status action to verify payment
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        "clickpesa-payment",
        {
          body: {
            action: "check-status",
            reference: reference,
          },
        }
      );

      if (paymentError) {
        console.error("Payment status check error:", paymentError);
        setStatus("error");
        setErrorMessage(paymentError.message || "Failed to check payment status");
        return;
      }

      if (!paymentResult?.success) {
        const errorMsg = paymentResult?.error || "Failed to verify payment";
        setStatus("error");
        setErrorMessage(errorMsg);
        return;
      }

      // Check payment status from response
      const paymentStatus = paymentResult?.data?.status;
      console.log("Payment status:", paymentStatus);
      setPaymentDetails(paymentResult?.data);

      if (paymentStatus === "COMPLETED" || paymentStatus === "completed") {
        // Payment successful - order should already be updated by Edge Function
        setStatus("completed");
        toast.success("Payment confirmed! Your order has been placed.");
      } else if (paymentStatus === "FAILED" || paymentStatus === "failed") {
        setStatus("failed");
        setErrorMessage("Payment failed. Please try again.");
        toast.error("Payment failed");
      } else if (paymentStatus === "PENDING" || paymentStatus === "pending") {
        // Payment still pending - poll again
        setPollCount((count) => count + 1);
        
        // Poll up to 10 times (50 seconds total)
        if (pollCount < 10) {
          setTimeout(() => {
            checkPaymentStatus();
          }, 5000); // Check again in 5 seconds
        } else {
          // After 10 polls, show message to check manually
          setStatus("error");
          setErrorMessage(
            "Payment is still processing. Please check your order status or contact support."
          );
        }
      } else {
        // Unknown status
        setStatus("error");
        setErrorMessage(`Unknown payment status: ${paymentStatus}`);
      }
    } catch (error: any) {
      console.error("Checkout success error:", error);
      setStatus("error");
      setErrorMessage(error.message || "An error occurred while checking payment status");
    }
  };

  const handleRetry = () => {
    setPollCount(0);
    setStatus("checking");
    setErrorMessage("");
    checkPaymentStatus();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        <div className="container max-w-2xl mx-auto px-4 py-12">
          {/* Checking Status */}
          {status === "checking" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Processing Payment
                </CardTitle>
                <CardDescription>
                  Please wait while we verify your payment with ClickPesa...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-center py-8">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <p className="text-center text-muted-foreground">
                    Order ID: <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{orderId}</code>
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Attempt {pollCount + 1} of 10
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Completed */}
          {status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Payment Confirmed
                </CardTitle>
                <CardDescription>
                  Thank you for your purchase!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="font-medium text-green-900">Payment Status: Completed</p>
                  <p className="text-sm text-green-700">
                    Your payment has been confirmed and your order is being processed.
                  </p>
                  {paymentDetails && (
                    <>
                      <p className="text-sm text-green-700">
                        Transaction ID: <code className="font-mono">{paymentDetails.transaction_id || paymentDetails.id}</code>
                      </p>
                      {paymentDetails.amount && (
                        <p className="text-sm text-green-700">
                          Amount: {new Intl.NumberFormat("en-TZ", {
                            style: "currency",
                            currency: "TZS",
                            minimumFractionDigits: 0,
                          }).format(paymentDetails.amount)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">What happens next?</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Your order has been created and saved</li>
                    <li>You'll receive a confirmation email shortly</li>
                    <li>You can track your order status in your account</li>
                    <li>We'll notify you when your items ship</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-1"
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={() => navigate(`/orders`)}
                    className="flex-1"
                  >
                    View My Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Failed */}
          {status === "failed" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Payment Failed
                </CardTitle>
                <CardDescription>
                  Your payment could not be processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                  <p className="font-medium text-red-900">Payment Status: Failed</p>
                  <p className="text-sm text-red-700">
                    {errorMessage || "Your payment was declined. Please try again or contact support."}
                  </p>
                  <p className="text-sm text-red-700">
                    Order ID: <code className="font-mono">{orderId}</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">What you can do:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Check that your payment information is correct</li>
                    <li>Ensure you have sufficient funds</li>
                    <li>Try again with a different payment method</li>
                    <li>Contact our support team for assistance</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/checkout")}
                    className="flex-1"
                  >
                    Back to Checkout
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {status === "error" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  {pollCount >= 10 ? "Verification Timeout" : "Error"}
                </CardTitle>
                <CardDescription>
                  {pollCount >= 10
                    ? "Payment verification is taking longer than expected"
                    : "Something went wrong during checkout"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="font-medium text-amber-900">
                    {pollCount >= 10 ? "Verification Timeout" : "Error"}
                  </p>
                  <p className="text-sm text-amber-700">
                    {errorMessage || "An unexpected error occurred"}
                  </p>
                  {orderId && (
                    <p className="text-sm text-amber-700">
                      Order ID: <code className="font-mono">{orderId}</code>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Troubleshooting:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {pollCount >= 10 ? (
                      <>
                        <li>Your payment may still be processing</li>
                        <li>Check your email for order confirmation</li>
                        <li>View your order status in your account</li>
                        <li>Contact support if you don't see your order</li>
                      </>
                    ) : (
                      <>
                        <li>Check your internet connection</li>
                        <li>Refresh the page and try again</li>
                        <li>Contact our support team for help</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-1"
                  >
                    Go Home
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="flex-1"
                  >
                    {pollCount >= 10 ? "Check Status Again" : "Retry"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
