import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  MapPin, 
  ShoppingBag, 
  ChevronLeft,
  Check,
  Loader2,
  Smartphone,
  Phone,
  XCircle
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  calculateShipping,
  calculateTax,
  getAllCountries,
  getCountryConfig,
} from "@/lib/shippingConfig";

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  address: z.string().min(5, "Address must be at least 5 characters").max(200),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  zipCode: z.string().min(4, "Zip code is required").max(20),
  country: z.string().min(2, "Country is required").max(100),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

type MobileNetwork = "MPESA" | "TIGOPESA" | "AIRTELMONEY" | "HALOPESA";
type PaymentMethod = "mobile_money" | "hosted_checkout";

const mobileNetworks: { id: MobileNetwork; name: string; color: string }[] = [
  { id: "MPESA", name: "M-Pesa", color: "bg-green-500" },
  { id: "TIGOPESA", name: "Tigo Pesa", color: "bg-blue-500" },
  { id: "AIRTELMONEY", name: "Airtel Money", color: "bg-red-500" },
  { id: "HALOPESA", name: "Halopesa", color: "bg-orange-500" },
];

import { useCurrency } from "@/hooks/useCurrency";
import { convertCurrency, formatPrice as formatPriceUtil, Currency } from "@/lib/currency";

// Keep formatPriceTZS for payment processing (Flutterwave requires TZS)
const formatPriceTZS = (price: number) => {
  // Convert USD to TZS (approximate rate)
  const tzsAmount = price * 2500;
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tzsAmount);
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { formatPrice, userCurrency } = useCurrency();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<MobileNetwork>("MPESA");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("hosted_checkout");
  const [paymentStep, setPaymentStep] = useState<"shipping" | "payment" | "processing">("shipping");
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed">("pending");
  const [pollCount, setPollCount] = useState(0);

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      email: user?.email || "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Tanzania",
    },
  });

  // Watch country field for real-time calculations
  const selectedCountry = form.watch("country");
  const availableCountries = getAllCountries();

  // Helper function to check if a product category is digital
  const isDigitalProduct = (category: string): boolean => {
    return ["Music", "Books", "Courses"].includes(category);
  };

  // Calculate shipping and tax exemptions
  // We need to fetch product categories to determine exemptions
  const [productCategories, setProductCategories] = useState<Record<string, string>>({});
  const [sellerCountries, setSellerCountries] = useState<Record<string, string | null>>({});

  // Fetch product categories and seller locations when items change
  useEffect(() => {
    const fetchProductInfo = async () => {
      try {
        if (items.length === 0) {
          setProductCategories({});
          setSellerCountries({});
          return;
        }

        const productIds = items.map((item) => item.id);
        const sellerIds = [...new Set(items.map((item) => item.seller_id))];

        // Fetch product categories
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, category, seller_id")
          .in("id", productIds);

        if (productsError) {
          console.error("Error fetching product categories:", productsError);
          setProductCategories({});
        } else if (products) {
          const categoryMap: Record<string, string> = {};
          products.forEach((p) => {
            categoryMap[p.id] = p.category;
          });
          setProductCategories(categoryMap);
        }

        // Fetch seller countries from profiles
        const { data: sellerProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, country")
          .in("id", sellerIds);

        if (profilesError) {
          console.error("Error fetching seller profiles:", profilesError);
          // Fallback: set all to null if fetch fails
          const sellerCountryMap: Record<string, string | null> = {};
          sellerIds.forEach((id) => {
            sellerCountryMap[id] = null;
          });
          setSellerCountries(sellerCountryMap);
        } else if (sellerProfiles) {
          const sellerCountryMap: Record<string, string | null> = {};
          sellerProfiles.forEach((profile) => {
            sellerCountryMap[profile.id] = profile.country;
          });
          setSellerCountries(sellerCountryMap);
        }
      } catch (error) {
        console.error("Unexpected error fetching product info:", error);
        setProductCategories({});
        setSellerCountries({});
      }
    };

    fetchProductInfo();
  }, [items.length]); // Only depend on items.length to prevent unnecessary refetches

  // Calculate exemptions
  const hasDigitalProducts = items.some((item) => {
    const category = productCategories[item.id];
    return category && isDigitalProduct(category);
  });

  const allProductsDigital = items.length > 0 && items.every((item) => {
    const category = productCategories[item.id];
    return category && isDigitalProduct(category);
  });

  // Calculate shipping and tax based on selected country
  // Use selectedCountry from form watch, fallback to "Tanzania" if not set
  const countryForCalculation = selectedCountry || "Tanzania";
  
  // Get seller countries for same-country exemption
  // For mixed carts, use the first seller's country (or null if not set)
  // In a real scenario, you might want to calculate per-item shipping
  const sellerCountryForExemption = items.length > 0 
    ? sellerCountries[items[0].seller_id] || null
    : null;
  
  // Shipping cost: calculated based on country and order total
  // Exempt for digital products or same-country matches
  const shippingCost = calculateShipping(
    countryForCalculation,
    totalPrice,
    allProductsDigital,
    sellerCountryForExemption
  );

  // Tax: calculated based on country and order total
  // Exempt for digital products
  const tax = calculateTax(
    countryForCalculation,
    totalPrice,
    allProductsDigital,
    sellerCountryForExemption
  );

  // Get country config for display purposes
  const countryConfig = getCountryConfig(countryForCalculation);

  const orderTotal = totalPrice + shippingCost + tax;
  const orderTotalTZS = orderTotal * 2500; // Convert to TZS

  const onShippingSubmit = async (data: ShippingFormData) => {
    if (!user) {
      toast.error("Please sign in to complete your order");
      navigate("/auth");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Set shipping data first
    setShippingData(data);
    setPaymentPhone(data.phone);
    setPaymentStep("processing");
    
    // Directly process payment with hosted checkout
    await processPaymentDirect(data);
  };

  // Direct payment processing with shipping data (for hosted checkout)
  const processPaymentDirect = async (shippingInfo: ShippingFormData) => {
    if (!user) {
      toast.error("Please sign in to complete your order");
      return;
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      // SECURITY FIX: Fetch actual product prices and stock from database
      const productIds = items.map((item) => item.id);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, price, currency, stock_quantity, is_active, seller_id, title, category")
        .in("id", productIds);

      if (productsError) {
        throw new Error("Failed to validate products. Please try again.");
      }

      if (!products || products.length !== items.length) {
        throw new Error("Some products are no longer available. Please refresh your cart.");
      }

      // Validate products are active and stock is available
      const validatedItems = items.map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.id);
        if (!product) {
          throw new Error(`Product ${cartItem.title} is no longer available.`);
        }

        if (!product.is_active) {
          throw new Error(`Product ${product.title} is no longer active.`);
        }

        if (product.stock_quantity !== null && product.stock_quantity < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for ${product.title}. Available: ${product.stock_quantity}, Requested: ${cartItem.quantity}`
          );
        }

        // Use the current seller_id from the database (product may have been reassigned)
        // This prevents "seller mismatch" errors when seller information changes
        return {
          ...cartItem,
          validatedPrice: product.price,
          validatedCurrency: (product.currency || 'USD') as Currency,
          validatedSellerId: product.seller_id, // Always use current seller from DB
          validatedCategory: product.category,
        };
      });

      // Calculate total using validated prices
      const validatedTotalPrice = validatedItems.reduce((sum, item) => {
        const priceInUSD = item.validatedCurrency === 'USD' 
          ? item.validatedPrice 
          : convertCurrency(item.validatedPrice, item.validatedCurrency, 'USD');
        return sum + priceInUSD * item.quantity;
      }, 0);

      const validatedAllDigital = validatedItems.every((item) =>
        isDigitalProduct(item.validatedCategory)
      );

      const countryForValidation = shippingInfo.country || "Tanzania";

      // Get seller countries
      const sellerIdsForValidation = [...new Set(validatedItems.map((item) => item.validatedSellerId))];
      let sellerProfilesForValidation = null;
      if (sellerIdsForValidation.length > 0) {
        const result = await supabase
          .from("profiles")
          .select("id, country")
          .in("id", sellerIdsForValidation);
        sellerProfilesForValidation = result.data;
      }

      const sellerCountryForValidation = sellerProfilesForValidation && sellerProfilesForValidation.length > 0
        ? sellerProfilesForValidation[0].country
        : null;

      const validatedShippingCost = calculateShipping(
        countryForValidation,
        validatedTotalPrice,
        validatedAllDigital,
        sellerCountryForValidation
      );

      const validatedTax = calculateTax(
        countryForValidation,
        validatedTotalPrice,
        validatedAllDigital,
        sellerCountryForValidation
      );

      const validatedOrderTotal = validatedTotalPrice + validatedShippingCost + validatedTax;
      const validatedOrderTotalTZS = validatedOrderTotal * 2500;

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          total_amount: validatedOrderTotal,
          status: "pending",
          shipping_address: {
            fullName: shippingInfo.fullName,
            email: shippingInfo.email,
            phone: shippingInfo.phone,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = validatedItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        seller_id: item.validatedSellerId,
        quantity: item.quantity,
        price_at_purchase: item.validatedPrice,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Generate payment reference (alphanumeric only, no hyphens - ClickPesa requirement)
      const reference = `ORDER${order.id.substring(0, 8).toUpperCase()}${Date.now()}`;

      // Create hosted checkout link
      const { data: checkoutResult, error: checkoutError } = await supabase.functions.invoke(
        "clickpesa-payment",
        {
          body: {
            action: "create-hosted-checkout",
            amount: validatedOrderTotalTZS,
            currency: "TZS",
            reference: reference,
            description: `Blinno Order Payment - ${validatedItems.length} item(s)`,
            return_url: `${window.location.origin}/checkout/success?order_id=${order.id}&reference=${reference}`,
            order_id: order.id,
          },
        }
      );

      if (checkoutError || !checkoutResult?.success) {
        console.error("ClickPesa checkout creation failed:", {
          checkoutError,
          checkoutResult,
          requestData: {
            action: "create-hosted-checkout",
            amount: validatedOrderTotalTZS,
            currency: "TZS",
            reference: reference,
            description: `Blinno Order Payment - ${validatedItems.length} item(s)`,
            return_url: `${window.location.origin}/checkout/success?order_id=${order.id}&reference=${reference}`,
            order_id: order.id,
          }
        });
        throw new Error(checkoutResult?.error || checkoutError?.message || "Failed to create checkout link");
      }

      const checkoutUrl = checkoutResult.checkout_url;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned from ClickPesa");
      }

      // Store order ID in localStorage for callback page
      localStorage.setItem("checkout_order_id", order.id);
      localStorage.setItem("checkout_reference", reference);
      
      console.log("Redirecting to ClickPesa hosted checkout:", checkoutUrl);
      
      // Redirect to ClickPesa hosted checkout page
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to place order");
      setPaymentStep("shipping");
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    if (!user || !shippingData) {
      toast.error("Please complete shipping information first");
      return;
    }

    // Validate phone number only for mobile money
    if (paymentMethod === "mobile_money" && (!paymentPhone || paymentPhone.length < 10)) {
      toast.error("Please enter a valid phone number for payment");
      return;
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      // SECURITY FIX: Fetch actual product prices and stock from database
      // This prevents price manipulation attacks
      const productIds = items.map((item) => item.id);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, price, currency, stock_quantity, is_active, seller_id, title, category")
        .in("id", productIds);

      if (productsError) {
        throw new Error("Failed to validate products. Please try again.");
      }

      if (!products || products.length !== items.length) {
        throw new Error("Some products are no longer available. Please refresh your cart.");
      }

      // Validate products are active and stock is available
      const validatedItems = items.map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.id);
        if (!product) {
          throw new Error(`Product ${cartItem.title} is no longer available.`);
        }

        if (!product.is_active) {
          throw new Error(`Product ${product.title} is no longer active.`);
        }

        // Validate stock quantity (null means unlimited for digital products)
        if (product.stock_quantity !== null && product.stock_quantity < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for ${product.title}. Available: ${product.stock_quantity}, Requested: ${cartItem.quantity}`
          );
        }

        // Use the current seller_id from the database (product may have been reassigned)
        // This prevents "seller mismatch" errors when seller information changes
        return {
          ...cartItem,
          validatedPrice: product.price, // Use database price, not client price
          validatedCurrency: (product.currency || 'USD') as Currency, // Include currency
          validatedSellerId: product.seller_id, // Always use current seller from DB
          validatedCategory: product.category, // Include category for exemption calculation
        };
      });

      // Calculate total using validated prices
      // Convert all prices to USD first for consistent calculations
      const validatedTotalPrice = validatedItems.reduce((sum, item) => {
        const priceInUSD = item.validatedCurrency === 'USD' 
          ? item.validatedPrice 
          : convertCurrency(item.validatedPrice, item.validatedCurrency, 'USD');
        return sum + priceInUSD * item.quantity;
      }, 0);

      // Check if all products are digital for exemptions
      const validatedAllDigital = validatedItems.every((item) =>
        isDigitalProduct(item.validatedCategory)
      );

      // Get selected country for calculations (use shippingData if available, otherwise form value)
      const countryForValidation = shippingData?.country || selectedCountry || "Tanzania";

      // Get seller countries for same-country exemption
      const sellerIdsForValidation = [...new Set(validatedItems.map((item) => item.validatedSellerId))];
      let sellerProfilesForValidation = null;
      if (sellerIdsForValidation.length > 0) {
        const result = await supabase
          .from("profiles")
          .select("id, country")
          .in("id", sellerIdsForValidation);
        sellerProfilesForValidation = result.data;
      }

      const sellerCountryForValidation = sellerProfilesForValidation && sellerProfilesForValidation.length > 0
        ? sellerProfilesForValidation[0].country // Use first seller's country for mixed carts
        : null;

      // Shipping cost: calculated based on country and order total
      // Exempt for digital products or same-country matches
      const validatedShippingCost = calculateShipping(
        countryForValidation,
        validatedTotalPrice,
        validatedAllDigital,
        sellerCountryForValidation
      );

      // Tax: calculated based on country and order total
      // Exempt for digital products
      const validatedTax = calculateTax(
        countryForValidation,
        validatedTotalPrice,
        validatedAllDigital,
        sellerCountryForValidation
      );

      const validatedOrderTotal = validatedTotalPrice + validatedShippingCost + validatedTax;
      const validatedOrderTotalTZS = validatedOrderTotal * 2500;

      // Create the order with server-validated total
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          total_amount: validatedOrderTotal, // Use validated total
          status: "pending",
          shipping_address: {
            fullName: shippingData.fullName,
            email: shippingData.email,
            phone: shippingData.phone,
            address: shippingData.address,
            city: shippingData.city,
            state: shippingData.state,
            zipCode: shippingData.zipCode,
            country: shippingData.country,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with validated prices
      const orderItems = validatedItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        seller_id: item.validatedSellerId, // Use validated seller_id
        quantity: item.quantity,
        price_at_purchase: item.validatedPrice, // Use database price, not client price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Generate payment reference (alphanumeric only, no hyphens - ClickPesa requirement)
      const reference = `ORDER${order.id.substring(0, 8).toUpperCase()}${Date.now()}`;

      if (paymentMethod === "hosted_checkout") {
        // Create hosted checkout session with return URL
        const currentURL = window.location.origin;
        const returnUrl = `${currentURL}/checkout/success?order_id=${order.id}&reference=${reference}`;
        
        const { data: hostedCheckoutResult, error: hostedCheckoutError } = await supabase.functions.invoke(
          "clickpesa-payment",
          {
            body: {
              action: "create-hosted-checkout",
              amount: validatedOrderTotalTZS,
              currency: "TZS",
              reference: reference,
              description: `Blinno Order Payment - ${validatedItems.length} item(s)`,
              return_url: returnUrl,
              order_id: order.id,
              customer_email: shippingData.email,
              customer_phone: paymentPhone,
            },
          }
        );

        if (hostedCheckoutError) {
          console.error("Hosted checkout creation error:", hostedCheckoutError);
          throw new Error(hostedCheckoutError.message || "Failed to create payment link. Please try again.");
        }

        if (!hostedCheckoutResult?.success) {
          const errorMsg = hostedCheckoutResult?.error || hostedCheckoutResult?.message || "Failed to create payment link";
          console.error("Hosted checkout error:", errorMsg, hostedCheckoutResult);
          throw new Error(errorMsg);
        }

        // Store payment reference
        setPaymentReference(reference);

        // Redirect to hosted checkout URL
        const checkoutUrl = hostedCheckoutResult?.checkout_url || hostedCheckoutResult?.data?.checkout_url;
        if (checkoutUrl) {
          toast.success("Redirecting to payment page...");
          window.location.href = checkoutUrl;
          return;
        } else {
          throw new Error("No checkout URL returned from payment provider");
        }
      } else {
        // Use Mobile Money (USSD push via ClickPesa)
        // Format phone number for ClickPesa (ensure it starts with 255)
        let formattedPhone = paymentPhone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
          formattedPhone = "255" + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith("255")) {
          formattedPhone = "255" + formattedPhone;
        }
      
        // Initiate ClickPesa mobile money payment
        // Use validated order total for payment
        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
          "clickpesa-payment",
          {
            body: {
              action: "initiate",
              amount: validatedOrderTotalTZS, // Use validated total
              currency: "TZS",
              phone_number: formattedPhone,
              network: selectedNetwork,
              reference: reference,
              description: `Blinno Order Payment - ${validatedItems.length} item(s)`,
              order_id: order.id,
            },
          }
        );
        
        if (paymentError) {
          console.error("Payment initiation error:", paymentError);
          console.error("Payment error details:", paymentError.message);
          throw new Error(paymentError.message || "Failed to initiate payment. Please try again.");
        }
        
        if (!paymentResult?.success) {
          const errorMsg = paymentResult?.error || paymentResult?.message || "Payment initiation failed";
          console.error("Payment result error:", errorMsg, paymentResult);
          throw new Error(errorMsg);
        }

        // Store payment reference and transaction ID for status polling
        setPaymentReference(reference);
        
        // Store transaction ID from payment response if available
        const transactionId = paymentResult?.data?.transaction_id || paymentResult?.data?.reference || null;
        if (transactionId) {
          // Store in a ref or state for status checking
          // The backend will look it up by reference, but we can also use transaction_id directly
        }

        // Show USSD push notification
        toast.success(
          `A USSD prompt has been sent to ${formattedPhone}. Please enter your PIN to complete the payment.`,
          { duration: 10000 }
        );
      }

      // Send order confirmation email
      await supabase.functions.invoke("order-confirmation", {
        body: {
          orderId: order.id,
          email: shippingData.email,
          customerName: shippingData.fullName,
          items: items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })),
          total: orderTotal,
          shippingAddress: shippingData,
        },
      });

      setOrderId(order.id);
      setOrderComplete(true);
      clearCart();
      toast.success("Order placed successfully! Complete the payment on your phone.");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to place order");
      setPaymentStep("payment");
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment status polling
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentReference || !orderId || paymentStatus !== "pending") return;

    try {
      // Use reference only - backend will look up transaction_id from database
      const { data, error } = await supabase.functions.invoke("clickpesa-payment", {
        body: {
          action: "check-status",
          reference: paymentReference,
        },
      });

      if (error) {
        console.error("Status check error:", error);
        return;
      }

      if (data?.data?.status === "COMPLETED") {
        setPaymentStatus("completed");
        toast.success("Payment completed successfully!");
      } else if (data?.data?.status === "FAILED" || data?.data?.status === "CANCELLED") {
        setPaymentStatus("failed");
        toast.error("Payment was not successful. Please try again.");
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  }, [paymentReference, orderId, paymentStatus]);

  // Poll for payment status every 5 seconds, up to 24 times (2 minutes)
  useEffect(() => {
    if (!orderComplete || !paymentReference || paymentStatus !== "pending" || pollCount >= 24) {
      return;
    }

    const interval = setInterval(() => {
      setPollCount((prev) => prev + 1);
      checkPaymentStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderComplete, paymentReference, paymentStatus, pollCount, checkPaymentStatus]);

  if (orderComplete && orderId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                paymentStatus === "completed" 
                  ? "bg-green-500/10" 
                  : paymentStatus === "failed" 
                  ? "bg-red-500/10" 
                  : "bg-amber-500/10"
              }`}
            >
              {paymentStatus === "completed" ? (
                <Check className="h-10 w-10 text-green-500" />
              ) : paymentStatus === "failed" ? (
                <XCircle className="h-10 w-10 text-red-500" />
              ) : (
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
              )}
            </motion.div>
            
            <h1 className="text-3xl font-bold">
              {paymentStatus === "completed" 
                ? "Payment Successful!" 
                : paymentStatus === "failed"
                ? "Payment Failed"
                : "Order Confirmed!"}
            </h1>
            
            <p className="mt-2 text-muted-foreground">
              {paymentStatus === "completed" 
                ? "Your payment has been received. Your order is being processed."
                : paymentStatus === "failed"
                ? "The payment was not completed. Please try again or use a different payment method."
                : "Thank you for your purchase. Complete the payment on your phone."}
            </p>

            {paymentStatus === "pending" && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 max-w-md mx-auto">
                <p className="text-sm text-amber-600">
                  <Smartphone className="inline-block h-4 w-4 mr-1" />
                  Check your phone to complete the payment via {selectedNetwork}
                </p>
                <p className="text-xs text-amber-600/70 mt-2">
                  Checking payment status... ({pollCount}/24)
                </p>
              </div>
            )}

            {paymentStatus === "completed" && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 max-w-md mx-auto">
                <p className="text-sm text-green-600">
                  <Check className="inline-block h-4 w-4 mr-1" />
                  Payment of {formatPriceTZS(orderTotal)} received
                </p>
              </div>
            )}

            <p className="mt-4 font-mono text-sm text-muted-foreground">
              Order ID: {orderId}
            </p>
            
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to="/buyer/orders">View Order Status</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex min-h-[60vh] items-center justify-center pt-20">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/50" />
            <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
            <p className="mt-2 text-muted-foreground">
              Add some items to your cart to checkout
            </p>
            <Button asChild className="mt-6">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <Link
            to="/products"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Shopping
          </Link>

          <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${paymentStep === "shipping" || paymentStep === "processing" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${paymentStep !== "shipping" && paymentStep !== "processing" ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"}`}>
                {paymentStep !== "shipping" && paymentStep !== "processing" ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className="hidden sm:inline font-medium">Shipping</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 ${paymentStep === "payment" || paymentStep === "processing" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${paymentStep === "payment" || paymentStep === "processing" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {paymentStep === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "2"
                )}
              </div>
              <span className="hidden sm:inline font-medium">Payment</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {paymentStep === "shipping" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {allProductsDigital ? "Contact Information" : "Shipping Information"}
                    </CardTitle>
                    {allProductsDigital && (
                      <CardDescription>
                        Digital products don't require physical shipping. We'll use this information for order confirmation and delivery.
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {allProductsDigital && (
                      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> All items in your cart are digital products. No shipping fees or taxes will be charged.
                        </p>
                      </div>
                    )}
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onShippingSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Enter your email address"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your street address"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your city" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Region</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your region" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter postal code" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country / Region</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select your country" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-[300px]">
                                    {availableCountries.map((country) => (
                                      <SelectItem key={country.value} value={country.value}>
                                        {country.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {countryConfig && !allProductsDigital && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Shipping: {countryConfig.shippingRate === 0 || totalPrice >= countryConfig.freeShippingThreshold
                                      ? "Free"
                                      : formatPrice(countryConfig.shippingRate)}
                                    {totalPrice < countryConfig.freeShippingThreshold && (
                                      <span className="ml-2">
                                        (Free over {formatPrice(countryConfig.freeShippingThreshold)})
                                      </span>
                                    )}
                                    {" • "}
                                    Tax: {countryConfig.taxExempt
                                      ? "Exempt"
                                      : `${(countryConfig.taxRate * 100).toFixed(1)}%`}
                                  </p>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {!user && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                            <p className="text-sm text-amber-600">
                              Please{" "}
                              <Link
                                to="/auth"
                                className="font-semibold underline hover:no-underline"
                              >
                                sign in
                              </Link>{" "}
                              to complete your order.
                            </p>
                          </div>
                        )}

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full"
                          disabled={!user || isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing Order...
                            </>
                          ) : (
                            "Continue to Payment"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {paymentStep === "payment" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Method
                    </CardTitle>
                    <CardDescription>
                      Choose how you'd like to pay for your order
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Select Payment Method</Label>
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                        className="space-y-3"
                      >
                        {/* Hosted Checkout Option */}
                        <div>
                          <RadioGroupItem
                            value="hosted_checkout"
                            id="hosted_checkout"
                            className="peer sr-only"
                            disabled={isProcessing}
                          />
                          <Label
                            htmlFor="hosted_checkout"
                            className={`flex flex-col gap-3 rounded-lg border-2 border-muted bg-popover p-4 transition-all cursor-pointer ${
                              isProcessing
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-accent hover:text-accent-foreground"
                            } peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <CreditCard className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <span className="font-medium block">Hosted Checkout</span>
                                <p className="text-sm text-muted-foreground">Secure payment page with all payment options</p>
                              </div>
                            </div>
                          </Label>
                        </div>

                        {/* Mobile Money USSD Option */}
                        <div>
                          <RadioGroupItem
                            value="mobile_money"
                            id="mobile_money"
                            className="peer sr-only"
                            disabled={isProcessing}
                          />
                          <Label
                            htmlFor="mobile_money"
                            className={`flex flex-col gap-3 rounded-lg border-2 border-muted bg-popover p-4 transition-all cursor-pointer ${
                              isProcessing
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-accent hover:text-accent-foreground"
                            } peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <Smartphone className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <span className="font-medium block">Mobile Money (USSD)</span>
                                <p className="text-sm text-muted-foreground">Instant payment via USSD push to your phone</p>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Hosted Checkout - No additional details needed */}
                    {paymentMethod === "hosted_checkout" && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                        <h4 className="font-medium text-blue-700 mb-2">Secure Payment:</h4>
                        <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
                          <li>Encrypted connection for your security</li>
                          <li>Multiple payment options available</li>
                          <li>Instant confirmation of payment</li>
                        </ul>
                      </div>
                    )}

                    {/* Mobile Money Option */}
                    {paymentMethod === "mobile_money" && (
                      <>
                        {/* Network Selection */}
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Select Mobile Money Provider</Label>
                          <RadioGroup
                            value={selectedNetwork}
                            onValueChange={(value) => setSelectedNetwork(value as MobileNetwork)}
                            className="grid grid-cols-2 gap-4"
                          >
                            {mobileNetworks.map((network) => (
                              <div key={network.id}>
                                <RadioGroupItem
                                  value={network.id}
                                  id={network.id}
                                  className="peer sr-only"
                                  disabled={isProcessing}
                                />
                                <Label
                                  htmlFor={network.id}
                                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 transition-all ${
                                    isProcessing
                                      ? "cursor-not-allowed opacity-50"
                                      : "hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  } peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary`}
                                >
                                  <div className={`h-10 w-10 rounded-full ${network.color} flex items-center justify-center mb-2`}>
                                    <Phone className="h-5 w-5 text-white" />
                                  </div>
                                  <span className="font-medium">{network.name}</span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        {/* Phone Number Input */}
                        <div className="space-y-2">
                          <Label htmlFor="payment-phone" className="text-base font-medium">
                            Mobile Money Number
                          </Label>
                          <Input
                            id="payment-phone"
                            type="tel"
                            placeholder="Enter your mobile money number"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            disabled={isProcessing}
                            className="text-lg"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the phone number registered with {selectedNetwork}
                          </p>
                        </div>

                        {/* Mobile Money Instructions */}
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                          <h4 className="font-medium text-blue-700 mb-2">How it works:</h4>
                          <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                            <li>Click "Pay Now" to initiate the payment</li>
                            <li>You'll receive a USSD prompt on your phone</li>
                            <li>Enter your {selectedNetwork} PIN to confirm</li>
                            <li>Your order will be processed automatically</li>
                          </ol>
                        </div>
                      </>
                    )}

                    {/* Payment Info */}
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount to Pay</span>
                        <span className="font-bold text-lg">{formatPriceTZS(orderTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatPrice(orderTotal)}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setPaymentStep("shipping")}
                        disabled={isProcessing}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        onClick={processPayment}
                        size="lg"
                        className="flex-1"
                        disabled={isProcessing || (paymentMethod === "mobile_money" && !paymentPhone)}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {paymentMethod === "hosted_checkout" ? "Preparing Payment..." : "Initiating Payment..."}
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            {paymentMethod === "hosted_checkout" ? "Go to Payment Page" : "Pay Now"} ({formatPriceTZS(orderTotal)})
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-1">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatPrice(item.price * item.quantity, (item.currency || 'USD') as Currency)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {shippingCost === 0 ? (
                          <span className="text-green-500">
                            {allProductsDigital
                              ? "Exempt (Digital)"
                              : sellerCountryForExemption &&
                                sellerCountryForExemption.trim().toLowerCase() ===
                                  countryForCalculation.trim().toLowerCase()
                              ? "Free (Same Country)"
                              : "Free"}
                          </span>
                        ) : (
                          formatPrice(shippingCost)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax
                        {countryConfig && !countryConfig.taxExempt && !allProductsDigital && (
                          <span className="text-muted-foreground/70">
                            {" "}({(countryConfig.taxRate * 100).toFixed(1)}%)
                          </span>
                        )}
                      </span>
                      <span>
                        {tax === 0 ? (
                          <span className="text-green-500">
                            {allProductsDigital
                              ? "Exempt (Digital)"
                              : countryConfig?.taxExempt
                              ? "Exempt"
                              : "N/A"}
                          </span>
                        ) : (
                          formatPrice(tax)
                        )}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <div className="text-right">
                      <span className="text-primary text-lg block">
                        {formatPrice(orderTotal)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ≈ {formatPriceTZS(orderTotal)}
                      </span>
                    </div>
                  </div>

                  {countryConfig &&
                    totalPrice < countryConfig.freeShippingThreshold &&
                    !allProductsDigital && (
                      <p className="text-xs text-muted-foreground text-center">
                        Add {formatPrice(
                          countryConfig.freeShippingThreshold - totalPrice
                        )}{" "}
                        more for free shipping to {selectedCountry}!
                      </p>
                    )}
                  {allProductsDigital && (
                    <p className="text-xs text-green-600 dark:text-green-400 text-center">
                      ✓ Digital products are exempt from shipping and tax
                    </p>
                  )}
                  {selectedCountry && countryConfig && !allProductsDigital && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Shipping to {selectedCountry}
                      {countryConfig.region && ` (${countryConfig.region})`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

