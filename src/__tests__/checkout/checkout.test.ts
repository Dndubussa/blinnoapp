/**
 * Checkout Flow Tests
 * Tests for cart validation, product verification, order creation, and price calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface CartItem {
  product_id: string;
  quantity: number;
  price: number;
  seller_id: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  seller_id: string;
  is_active: boolean;
}

interface ShippingInfo {
  country: string;
  region: string;
  address: string;
  postal_code: string;
}

interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  created_at: string;
}

// Checkout Service
class CheckoutService {
  private products: Map<string, Product> = new Map();
  private exchangeRates: Map<string, number> = new Map();

  constructor() {
    // Initialize exchange rates
    this.exchangeRates.set('TZS', 1);
    this.exchangeRates.set('KES', 0.012);
    this.exchangeRates.set('UGX', 0.00026);
  }

  async validateCart(items: CartItem[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!items || items.length === 0) {
      errors.push('Cart is empty');
      return { valid: false, errors };
    }

    // Validate each item
    for (const item of items) {
      const product = await this.fetchProduct(item.product_id);

      if (!product) {
        errors.push(`Product ${item.product_id} not found`);
        continue;
      }

      if (!product.is_active) {
        errors.push(`Product ${product.name} is no longer available`);
      }

      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for product ${product.name}`);
      }

      if (item.quantity > product.stock) {
        errors.push(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      if (item.price <= 0) {
        errors.push(`Invalid price for product ${product.name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async verifyProductPrices(items: CartItem[]): Promise<{ valid: boolean; mismatches: string[] }> {
    const mismatches: string[] = [];

    for (const item of items) {
      const product = await this.fetchProduct(item.product_id);

      if (product && product.price !== item.price) {
        mismatches.push(
          `Price mismatch for ${product.name}: Item price ${item.price} != Server price ${product.price}`
        );
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches,
    };
  }

  calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  calculateTax(subtotal: number, taxRate: number = 0.18): number {
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  calculateShipping(items: CartItem[], destination: ShippingInfo): number {
    // Simulate shipping cost calculation based on destination and items
    const baseShipping = 5000; // TZS
    const itemWeight = items.length * 1; // kg per item

    let regionMultiplier = 1;
    if (destination.region === 'Dar es Salaam') {
      regionMultiplier = 0.8;
    } else if (['Morogoro', 'Coastal'].includes(destination.region)) {
      regionMultiplier = 1.2;
    } else if (destination.region === 'Northern') {
      regionMultiplier = 1.5;
    }

    return Math.round(baseShipping * regionMultiplier * (1 + itemWeight * 0.1));
  }

  calculateDiscount(subtotal: number, couponCode?: string): number {
    if (!couponCode) return 0;

    const discounts: Record<string, number> = {
      'SAVE10': 0.10,
      'SAVE20': 0.20,
      'WELCOME': 0.05,
    };

    const rate = discounts[couponCode] || 0;
    return Math.round(subtotal * rate * 100) / 100;
  }

  async createOrder(
    items: CartItem[],
    shipping: ShippingInfo,
    userId: string,
    couponCode?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      // Validate cart
      const cartValidation = await this.validateCart(items);
      if (!cartValidation.valid) {
        return {
          success: false,
          error: `Cart validation failed: ${cartValidation.errors.join('; ')}`,
        };
      }

      // Verify prices
      const priceValidation = await this.verifyProductPrices(items);
      if (!priceValidation.valid) {
        return {
          success: false,
          error: `Price verification failed: ${priceValidation.mismatches.join('; ')}`,
        };
      }

      // Calculate totals
      const subtotal = this.calculateSubtotal(items);
      const tax = this.calculateTax(subtotal);
      const shippingCost = this.calculateShipping(items, shipping);
      const discount = this.calculateDiscount(subtotal, couponCode);
      const total = subtotal + tax + shippingCost - discount;

      // Create order object
      const order: Order = {
        id: `order_${Date.now()}_${userId}`,
        items,
        subtotal,
        tax,
        shipping: shippingCost,
        discount,
        total,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Save to database (simulated)
      await this.saveOrder(order, userId, shipping);

      return { success: true, order };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async fetchProduct(productId: string): Promise<Product | null> {
    // Simulate database fetch
    if (this.products.has(productId)) {
      return this.products.get(productId) || null;
    }

    // Return mock product for testing
    return {
      id: productId,
      name: `Product ${productId}`,
      price: 50000,
      stock: 100,
      seller_id: 'seller_001',
      is_active: true,
    };
  }

  private async saveOrder(order: Order, userId: string, shipping: ShippingInfo): Promise<void> {
    // Simulate database save
    console.log(`Order created: ${order.id} for user ${userId}`);
  }

  setProduct(product: Product): void {
    this.products.set(product.id, product);
  }
}

// Tests
describe('CheckoutService', () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    checkoutService = new CheckoutService();
  });

  describe('Cart Validation', () => {
    it('should validate cart with valid items', async () => {
      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 2,
          price: 50000,
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.validateCart(items);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty cart', async () => {
      const result = await checkoutService.validateCart([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cart is empty');
    });

    it('should reject items with zero quantity', async () => {
      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 0,
          price: 50000,
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.validateCart(items);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid quantity'))).toBe(true);
    });

    it('should reject items exceeding stock', async () => {
      const outOfStockProduct: Product = {
        id: 'prod_001',
        name: 'Out of Stock Product',
        price: 50000,
        stock: 5,
        seller_id: 'seller_001',
        is_active: true,
      };

      checkoutService.setProduct(outOfStockProduct);

      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 10,
          price: 50000,
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.validateCart(items);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient stock'))).toBe(true);
    });

    it('should reject inactive products', async () => {
      const inactiveProduct: Product = {
        id: 'prod_001',
        name: 'Inactive Product',
        price: 50000,
        stock: 100,
        seller_id: 'seller_001',
        is_active: false,
      };

      checkoutService.setProduct(inactiveProduct);

      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 2,
          price: 50000,
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.validateCart(items);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no longer available'))).toBe(true);
    });
  });

  describe('Price Verification', () => {
    it('should verify matching prices', async () => {
      const product: Product = {
        id: 'prod_001',
        name: 'Laptop',
        price: 1500000,
        stock: 100,
        seller_id: 'seller_001',
        is_active: true,
      };

      checkoutService.setProduct(product);

      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 1,
          price: 1500000,
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.verifyProductPrices(items);

      expect(result.valid).toBe(true);
      expect(result.mismatches).toHaveLength(0);
    });

    it('should detect price mismatches', async () => {
      const product: Product = {
        id: 'prod_001',
        name: 'Laptop',
        price: 1500000,
        stock: 100,
        seller_id: 'seller_001',
        is_active: true,
      };

      checkoutService.setProduct(product);

      const items: CartItem[] = [
        {
          product_id: 'prod_001',
          quantity: 1,
          price: 1200000, // Different price
          seller_id: 'seller_001',
        },
      ];

      const result = await checkoutService.verifyProductPrices(items);

      expect(result.valid).toBe(false);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });
  });

  describe('Calculation Logic', () => {
    it('should calculate subtotal correctly', () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 2, price: 50000, seller_id: 'seller_001' },
        { product_id: 'prod_002', quantity: 1, price: 100000, seller_id: 'seller_001' },
      ];

      const subtotal = checkoutService.calculateSubtotal(items);

      expect(subtotal).toBe(200000); // (2 * 50000) + (1 * 100000)
    });

    it('should calculate tax correctly', () => {
      const subtotal = 100000;
      const tax = checkoutService.calculateTax(subtotal, 0.18);

      expect(tax).toBe(18000);
    });

    it('should calculate shipping based on region', () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000, seller_id: 'seller_001' },
      ];

      const dszShipping = checkoutService.calculateShipping(items, {
        country: 'Tanzania',
        region: 'Dar es Salaam',
        address: '123 Main St',
        postal_code: '00100',
      });

      const norternShipping = checkoutService.calculateShipping(items, {
        country: 'Tanzania',
        region: 'Northern',
        address: '456 North Ave',
        postal_code: '00200',
      });

      expect(dszShipping).toBeLessThan(norternShipping);
    });

    it('should apply coupon discounts', () => {
      const subtotal = 100000;

      const discount10 = checkoutService.calculateDiscount(subtotal, 'SAVE10');
      const discount20 = checkoutService.calculateDiscount(subtotal, 'SAVE20');
      const discount0 = checkoutService.calculateDiscount(subtotal, 'INVALID');

      expect(discount10).toBe(10000);
      expect(discount20).toBe(20000);
      expect(discount0).toBe(0);
    });
  });

  describe('Order Creation', () => {
    it('should create order successfully', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000, seller_id: 'seller_001' },
      ];

      const shipping: ShippingInfo = {
        country: 'Tanzania',
        region: 'Dar es Salaam',
        address: '123 Main St',
        postal_code: '00100',
      };

      const result = await checkoutService.createOrder(items, shipping, 'user_001');

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.id).toBeDefined();
      expect(result.order?.status).toBe('pending');
      expect(result.order?.total).toBeGreaterThan(0);
    });

    it('should fail on invalid cart', async () => {
      const items: CartItem[] = [];

      const shipping: ShippingInfo = {
        country: 'Tanzania',
        region: 'Dar es Salaam',
        address: '123 Main St',
        postal_code: '00100',
      };

      const result = await checkoutService.createOrder(items, shipping, 'user_001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cart validation failed');
    });

    it('should apply coupon code during order creation', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000, seller_id: 'seller_001' },
      ];

      const shipping: ShippingInfo = {
        country: 'Tanzania',
        region: 'Dar es Salaam',
        address: '123 Main St',
        postal_code: '00100',
      };

      // Test that coupon code parameter is accepted and processes discount
      const resultWithCoupon = await checkoutService.createOrder(
        items,
        shipping,
        'user_001',
        'SAVE10'
      );

      // Verify order creation succeeds with coupon applied
      expect(resultWithCoupon.success).toBe(true);
      expect(resultWithCoupon.order?.id).toBeDefined();
      // SAVE10 coupon gives 10% discount: 50000 * 0.10 = 5000
      expect(resultWithCoupon.order?.discount).toBe(5000);
    });

    it('should calculate correct order total', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 2, price: 50000, seller_id: 'seller_001' },
      ];

      const shipping: ShippingInfo = {
        country: 'Tanzania',
        region: 'Dar es Salaam',
        address: '123 Main St',
        postal_code: '00100',
      };

      const result = await checkoutService.createOrder(items, shipping, 'user_001');

      if (result.order) {
        const expected =
          result.order.subtotal +
          result.order.tax +
          result.order.shipping -
          result.order.discount;

        expect(result.order.total).toBe(expected);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple items from different sellers', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000, seller_id: 'seller_001' },
        { product_id: 'prod_002', quantity: 1, price: 75000, seller_id: 'seller_002' },
        { product_id: 'prod_003', quantity: 2, price: 100000, seller_id: 'seller_003' },
      ];

      const result = await checkoutService.validateCart(items);

      expect(result.valid).toBe(true);
    });

    it('should handle large quantities', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1000, price: 50000, seller_id: 'seller_001' },
      ];

      const subtotal = checkoutService.calculateSubtotal(items);

      expect(subtotal).toBe(50000000);
    });

    it('should handle fractional prices', async () => {
      const items: CartItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 1250.50, seller_id: 'seller_001' },
      ];

      const subtotal = checkoutService.calculateSubtotal(items);

      expect(subtotal).toBe(1250.5);
    });
  });
});
