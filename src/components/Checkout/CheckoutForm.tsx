import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShippingForm, type ShippingFormData } from "./ShippingForm";
import { PaymentMethodSelector, type PaymentMethod, type MobileNetwork } from "./PaymentMethodSelector";
import { OrderSummary } from "./OrderSummary";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CheckoutFormProps {
  items: any[];
  totalPrice: number;
  userCurrency: string;
  formatPrice: (price: number) => string;
  countries: string[];
  states: Record<string, string[]>;
  onPaymentSuccess?: (orderId: string, paymentRef: string) => void;
  onPaymentError?: (error: string) => void;
  onShippingSubmit?: (data: ShippingFormData) => Promise<boolean>;
  isLoading?: boolean;
}

/**
 * CheckoutForm Component
 * Main orchestrator for the checkout flow:
 * 1. Shipping information collection
 * 2. Payment method selection
 * 3. Order summary and confirmation
 * Handles step navigation and payment processing
 */
export function CheckoutForm({
  items,
  totalPrice,
  userCurrency,
  formatPrice,
  countries,
  states,
  onPaymentSuccess,
  onPaymentError,
  onShippingSubmit,
  isLoading = false,
}: CheckoutFormProps) {
  const [step, setStep] = useState<"shipping" | "payment" | "processing">("shipping");
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("hosted_checkout");
  const [selectedNetwork, setSelectedNetwork] = useState<MobileNetwork>("MPESA");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Calculate order totals
  const subtotal = totalPrice;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const shipping = calculateShipping(items, shippingData);
  const discount = 0; // TODO: Implement coupon logic
  const total = subtotal + tax + shipping - discount;

  const handleShippingSubmit = useCallback(
    async (data: ShippingFormData) => {
      try {
        // Call optional callback
        if (onShippingSubmit) {
          const success = await onShippingSubmit(data);
          if (!success) {
            toast.error("Failed to process shipping information");
            return;
          }
        }

        setShippingData(data);
        setStep("payment");
        toast.success("Shipping information saved");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to process shipping";
        toast.error(errorMessage);
        onPaymentError?.(errorMessage);
      }
    },
    [onShippingSubmit, onPaymentError]
  );

  const handlePaymentSubmit = useCallback(async () => {
    if (!shippingData) {
      toast.error("Shipping information is required");
      return;
    }

    if (selectedPaymentMethod === "mobile_money" && !paymentPhone) {
      toast.error("Phone number is required for mobile money payment");
      return;
    }

    setIsProcessingPayment(true);
    setStep("processing");

    try {
      // Simulate payment processing
      const paymentRef = `pay_${Date.now()}`;
      
      // TODO: Implement actual payment processing
      // - For mobile_money: Initiate STK push via ClickPesa
      // - For hosted_checkout: Redirect to Flutterwave

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const orderId = `order_${Date.now()}`;
      
      toast.success("Payment processed successfully");
      onPaymentSuccess?.(orderId, paymentRef);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      toast.error(errorMessage);
      onPaymentError?.(errorMessage);
      setStep("payment");
    } finally {
      setIsProcessingPayment(false);
    }
  }, [shippingData, selectedPaymentMethod, paymentPhone, onPaymentSuccess, onPaymentError]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {["shipping", "payment", "processing"].map((s, index) => {
            const isActive = step === s || 
              (step === "payment" && ["shipping"].includes(s)) ||
              (step === "processing" && true);

            return (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      isActive ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shipping</span>
          <span>Payment</span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Step */}
          {step !== "processing" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {step === "shipping" && (
                <ShippingForm
                  onSubmit={handleShippingSubmit}
                  isLoading={isLoading}
                  countries={countries}
                  states={states}
                  initialData={shippingData || undefined}
                />
              )}
            </motion.div>
          )}

          {/* Payment Step */}
          {step !== "processing" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: step === "payment" ? 1 : 0 }}
              className={step === "payment" ? "block" : "hidden"}
            >
              {step === "payment" && shippingData && (
                <>
                  <div className="space-y-4">
                    <PaymentMethodSelector
                      selectedMethod={selectedPaymentMethod}
                      selectedNetwork={selectedNetwork}
                      paymentPhone={paymentPhone}
                      onMethodChange={setSelectedPaymentMethod}
                      onNetworkChange={setSelectedNetwork}
                      onPhoneChange={setPaymentPhone}
                      isLoading={isProcessingPayment}
                      total={total}
                      currency={userCurrency}
                    />

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep("shipping")}
                        disabled={isProcessingPayment}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </Button>

                      <Button
                        onClick={handlePaymentSubmit}
                        disabled={isProcessingPayment}
                        className="flex-1 flex items-center justify-center gap-2"
                        size="lg"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Pay ${formatPrice(total)}`
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold mb-2">Processing Payment</p>
              <p className="text-muted-foreground text-center">
                Please don't close this page while we process your payment...
              </p>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              tax={tax}
              shipping={shipping}
              discount={discount}
              total={total}
              currency={userCurrency}
              isLoading={isLoading}
              formatPrice={formatPrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate shipping cost based on items and destination
 * TODO: This should be moved to a shared utility or API call
 */
function calculateShipping(items: any[], shippingData: ShippingFormData | null): number {
  if (!shippingData) return 0;

  const baseShipping = 5000; // TZS
  const itemWeight = items.length * 1; // kg per item

  let regionMultiplier = 1;
  if (shippingData.city === "Dar es Salaam") {
    regionMultiplier = 0.8;
  } else if (["Morogoro", "Coastal"].includes(shippingData.state)) {
    regionMultiplier = 1.2;
  } else if (shippingData.state === "Northern") {
    regionMultiplier = 1.5;
  }

  return Math.round(baseShipping * regionMultiplier * (1 + itemWeight * 0.1));
}

export default CheckoutForm;
