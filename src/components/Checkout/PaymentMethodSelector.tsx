import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CreditCard, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type PaymentMethod = "mobile_money" | "hosted_checkout";
export type MobileNetwork = "MPESA" | "TIGOPESA" | "AIRTELMONEY" | "HALOPESA";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  selectedNetwork: MobileNetwork;
  paymentPhone: string;
  onMethodChange: (method: PaymentMethod) => void;
  onNetworkChange: (network: MobileNetwork) => void;
  onPhoneChange: (phone: string) => void;
  isLoading?: boolean;
  total: number;
  currency: string;
}

/**
 * PaymentMethodSelector Component
 * Handles payment method selection (Mobile Money vs Hosted Checkout)
 * Manages mobile network and phone number validation
 */
export function PaymentMethodSelector({
  selectedMethod,
  selectedNetwork,
  paymentPhone,
  onMethodChange,
  onNetworkChange,
  onPhoneChange,
  isLoading = false,
  total,
  currency,
}: PaymentMethodSelectorProps) {
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const mobileNetworks: { value: MobileNetwork; label: string }[] = [
    { value: "MPESA", label: "M-Pesa" },
    { value: "TIGOPESA", label: "Tigo Pesa" },
    { value: "AIRTELMONEY", label: "Airtel Money" },
    { value: "HALOPESA", label: "Halo Pesa" },
  ];

  const validatePhoneNumber = (phone: string): boolean => {
    // Tanzania phone validation: 255XXXXXXXXX or +255XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+?255|0)[0-9]{9}$/;
    const normalized = phone.replace(/\s/g, "");
    return phoneRegex.test(normalized);
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value);

    if (value && !validatePhoneNumber(value)) {
      setPhoneError("Invalid Tanzania phone number (e.g., 255712345678 or +255712345678)");
    } else {
      setPhoneError(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <div>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Choose how you want to pay</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Payment Total */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">Total Amount to Pay</div>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currency === "TZS" ? "TZS" : currency,
              }).format(total)}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Select Payment Method</h3>

            <RadioGroup
              value={selectedMethod}
              onValueChange={(value) => onMethodChange(value as PaymentMethod)}
              disabled={isLoading}
            >
              {/* Mobile Money Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition">
                <RadioGroupItem
                  value="mobile_money"
                  id="mobile_money"
                  disabled={isLoading}
                  className="mt-1"
                />
                <Label
                  htmlFor="mobile_money"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4" />
                    <span className="font-medium">Mobile Money (M-Pesa, Tigo, Airtel, Halo)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quick and easy payment using mobile networks
                  </p>
                </Label>
              </div>

              {/* Hosted Checkout Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition">
                <RadioGroupItem
                  value="hosted_checkout"
                  id="hosted_checkout"
                  disabled={isLoading}
                  className="mt-1"
                />
                <Label
                  htmlFor="hosted_checkout"
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Card Payment (Visa, Mastercard, Other)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Secure payment with credit or debit cards
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mobile Money Configuration */}
          {selectedMethod === "mobile_money" && (
            <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-accent">
              <h3 className="text-sm font-medium">Mobile Money Details</h3>

              {/* Network Selection */}
              <div className="space-y-2">
                <Label htmlFor="network-select">Mobile Network</Label>
                <Select
                  value={selectedNetwork}
                  onValueChange={(value) => onNetworkChange(value as MobileNetwork)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="network-select">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {mobileNetworks.map((network) => (
                      <SelectItem key={network.value} value={network.value}>
                        {network.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="phone-input">Phone Number</Label>
                <Input
                  id="phone-input"
                  placeholder="255712345678"
                  value={paymentPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={isLoading}
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span>⚠</span> {phoneError}
                  </p>
                )}
              </div>

              {/* Network Info */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs text-blue-900">
                  <strong>How it works:</strong> You'll receive an STK push (prompt) on your {selectedNetwork} account. Enter your M-Pesa PIN to complete the payment.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Hosted Checkout Info */}
          {selectedMethod === "hosted_checkout" && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-xs text-blue-900">
                <strong>How it works:</strong> You'll be redirected to a secure payment page where you can enter your card details. Payments are processed by Flutterwave.
              </AlertDescription>
            </Alert>
          )}

          {/* Security Notice */}
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-xs text-green-900">
              <strong>🔒 Secure:</strong> All payments are encrypted and processed securely. We never store your payment details.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentMethodSelector;
