import { ShoppingBag, Tag, Truck, PercentSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Currency } from "@/lib/currency";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  currency?: string; // Product currency
  quantity: number;
  image_url?: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  couponCode?: string;
  onApplyCoupon?: (code: string) => void;
  isLoading?: boolean;
  formatPrice: (price: number, productCurrency?: Currency) => string;
}

/**
 * OrderSummary Component
 * Displays order breakdown with items, calculations, and totals
 * Shows tax, shipping, and discount information
 */
export function OrderSummary({
  items,
  subtotal,
  tax,
  shipping,
  discount,
  total,
  currency,
  couponCode,
  onApplyCoupon,
  isLoading = false,
  formatPrice,
}: OrderSummaryProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your order details</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Items List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Order Items ({items.length})</h3>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-accent/50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatPrice(item.price, (item.currency || 'USD') as Currency)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-right whitespace-nowrap ml-2">
                    {formatPrice(item.price * item.quantity, (item.currency || 'USD') as Currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Tax (18%)</span>
            </div>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>

          {/* Shipping */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span>Shipping</span>
            </div>
            <span className="font-medium">{formatPrice(shipping)}</span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <PercentSquare className="w-4 h-4" />
                <span>Discount</span>
                {couponCode && <span className="text-xs bg-green-200 px-2 py-0.5 rounded">{couponCode}</span>}
              </div>
              <span className="font-medium text-green-700">-{formatPrice(discount)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="text-sm text-muted-foreground mb-2">Total Amount</div>
          <div className="text-3xl font-bold text-primary">
            {formatPrice(total)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Currency: {currency}
          </div>
        </div>

        {/* Coupon Application */}
        {onApplyCoupon && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Have a Coupon Code?</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                defaultValue={couponCode}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
                disabled={isLoading}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector(
                    'input[placeholder="Enter coupon code"]'
                  ) as HTMLInputElement;
                  if (input?.value) {
                    onApplyCoupon(input.value);
                  }
                }}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>ℹ️ Note:</strong> Prices are calculated in {currency}. Actual charges may vary slightly based on your payment method and current exchange rates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderSummary;
