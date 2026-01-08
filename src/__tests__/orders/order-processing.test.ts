/**
 * Order and Product Validation Tests
 * Tests for order processing, product stock management, and seller validations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  total: number;
}

interface Seller {
  id: string;
  name: string;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  commission_rate: number;
}

interface StockRecord {
  product_id: string;
  stock: number;
  reserved: number;
}

// Order Processing Service
class OrderProcessingService {
  private orders: Map<string, Order> = new Map();
  private sellers: Map<string, Seller> = new Map();
  private stock: Map<string, StockRecord> = new Map();

  async createOrder(userId: string, items: OrderItem[]): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Validate user
      if (!userId || userId.trim().length === 0) {
        throw new Error('Invalid user ID');
      }

      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      // Check stock availability
      for (const item of items) {
        const stockRecord = this.stock.get(item.product_id);
        if (!stockRecord) {
          throw new Error(`Product ${item.product_id} not found in inventory`);
        }

        const availableStock = stockRecord.stock - stockRecord.reserved;
        if (availableStock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.product_id}. Available: ${availableStock}, Requested: ${item.quantity}`
          );
        }
      }

      // Reserve stock
      for (const item of items) {
        const record = this.stock.get(item.product_id)!;
        record.reserved += item.quantity;
      }

      // Create order
      const orderId = `order_${Date.now()}_${userId}`;
      const order: Order = {
        id: orderId,
        user_id: userId,
        items,
        status: 'pending',
        created_at: new Date().toISOString(),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };

      this.orders.set(orderId, order);

      return { success: true, orderId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async confirmOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = this.orders.get(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Cannot confirm order with status ${order.status}`);
      }

      // Deduct from actual stock
      for (const item of order.items) {
        const record = this.stock.get(item.product_id)!;
        record.stock -= item.quantity;
        record.reserved -= item.quantity;
      }

      order.status = 'confirmed';

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = this.orders.get(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error(`Cannot cancel order with status ${order.status}`);
      }

      // Release reserved stock
      for (const item of order.items) {
        const record = this.stock.get(item.product_id);
        if (record) {
          record.reserved = Math.max(0, record.reserved - item.quantity);
        }
      }

      order.status = 'cancelled';

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async validateSeller(sellerId: string): Promise<{ valid: boolean; reason?: string }> {
    const seller = this.sellers.get(sellerId);

    if (!seller) {
      return { valid: false, reason: 'Seller not found' };
    }

    if (!seller.is_active) {
      return { valid: false, reason: 'Seller account is inactive' };
    }

    if (!seller.is_verified) {
      return { valid: false, reason: 'Seller not verified' };
    }

    if (seller.rating < 2.0) {
      return { valid: false, reason: 'Seller rating is below acceptable threshold' };
    }

    return { valid: true };
  }

  async getOrderHistory(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.user_id === userId);
  }

  setSeller(seller: Seller): void {
    this.sellers.set(seller.id, seller);
  }

  setStock(productId: string, stock: number): void {
    this.stock.set(productId, {
      product_id: productId,
      stock,
      reserved: 0,
    });
  }

  getStock(productId: string): StockRecord | undefined {
    return this.stock.get(productId);
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}

// Tests
describe('OrderProcessingService', () => {
  let service: OrderProcessingService;

  beforeEach(() => {
    service = new OrderProcessingService();
    // Setup test data
    service.setStock('prod_001', 100);
    service.setStock('prod_002', 50);
    service.setStock('prod_003', 0);
  });

  describe('Order Creation', () => {
    it('should create order successfully with valid data', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 2, price: 50000 },
      ];

      const result = await service.createOrder('user_001', items);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
    });

    it('should fail with empty user ID', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000 },
      ];

      const result = await service.createOrder('', items);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
    });

    it('should fail with empty cart', async () => {
      const result = await service.createOrder('user_001', []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one item');
    });

    it('should fail when product not found', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_nonexistent', quantity: 1, price: 50000 },
      ];

      const result = await service.createOrder('user_001', items);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in inventory');
    });

    it('should fail when insufficient stock', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 150, price: 50000 },
      ];

      const result = await service.createOrder('user_001', items);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
    });

    it('should fail when product has zero stock', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_003', quantity: 1, price: 50000 },
      ];

      const result = await service.createOrder('user_001', items);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
    });

    it('should reserve stock when order created', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 10, price: 50000 },
      ];

      const stockBefore = service.getStock('prod_001')!.reserved;
      await service.createOrder('user_001', items);
      const stockAfter = service.getStock('prod_001')!.reserved;

      expect(stockAfter).toBe(stockBefore + 10);
    });

    it('should handle multiple items in single order', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 2, price: 50000 },
        { product_id: 'prod_002', quantity: 3, price: 75000 },
      ];

      const result = await service.createOrder('user_001', items);

      expect(result.success).toBe(true);
      expect(service.getStock('prod_001')!.reserved).toBe(2);
      expect(service.getStock('prod_002')!.reserved).toBe(3);
    });
  });

  describe('Order Confirmation', () => {
    it('should confirm pending order', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 5, price: 50000 },
      ];

      const createResult = await service.createOrder('user_001', items);
      const confirmResult = await service.confirmOrder(createResult.orderId!);

      expect(confirmResult.success).toBe(true);
      expect(service.getOrder(createResult.orderId!)?.status).toBe('confirmed');
    });

    it('should deduct stock on order confirmation', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 5, price: 50000 },
      ];

      const stockBefore = service.getStock('prod_001')!.stock;
      const createResult = await service.createOrder('user_001', items);
      await service.confirmOrder(createResult.orderId!);
      const stockAfter = service.getStock('prod_001')!.stock;

      expect(stockAfter).toBe(stockBefore - 5);
    });

    it('should fail to confirm non-existent order', async () => {
      const result = await service.confirmOrder('invalid_order_id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail to confirm already confirmed order', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 5, price: 50000 },
      ];

      const createResult = await service.createOrder('user_001', items);
      await service.confirmOrder(createResult.orderId!);
      const result = await service.confirmOrder(createResult.orderId!);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot confirm order');
    });
  });

  describe('Order Cancellation', () => {
    it('should cancel pending order', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 5, price: 50000 },
      ];

      const createResult = await service.createOrder('user_001', items);
      const cancelResult = await service.cancelOrder(createResult.orderId!);

      expect(cancelResult.success).toBe(true);
      expect(service.getOrder(createResult.orderId!)?.status).toBe('cancelled');
    });

    it('should release reserved stock on cancellation', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 10, price: 50000 },
      ];

      const createResult = await service.createOrder('user_001', items);
      const reservedBefore = service.getStock('prod_001')!.reserved;
      await service.cancelOrder(createResult.orderId!);
      const reservedAfter = service.getStock('prod_001')!.reserved;

      expect(reservedAfter).toBe(reservedBefore - 10);
    });

    it('should fail to cancel non-existent order', async () => {
      const result = await service.cancelOrder('invalid_order_id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail to cancel shipped order', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod_001', quantity: 5, price: 50000 },
      ];

      const createResult = await service.createOrder('user_001', items);
      const order = service.getOrder(createResult.orderId!)!;
      order.status = 'shipped'; // Manually change status for test

      const result = await service.cancelOrder(createResult.orderId!);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel order');
    });
  });

  describe('Seller Validation', () => {
    it('should validate verified seller', async () => {
      const seller: Seller = {
        id: 'seller_001',
        name: 'Good Seller',
        is_verified: true,
        is_active: true,
        rating: 4.5,
        commission_rate: 0.15,
      };

      service.setSeller(seller);

      const result = await service.validateSeller('seller_001');

      expect(result.valid).toBe(true);
    });

    it('should reject unverified seller', async () => {
      const seller: Seller = {
        id: 'seller_001',
        name: 'Unverified Seller',
        is_verified: false,
        is_active: true,
        rating: 4.5,
        commission_rate: 0.15,
      };

      service.setSeller(seller);

      const result = await service.validateSeller('seller_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not verified');
    });

    it('should reject inactive seller', async () => {
      const seller: Seller = {
        id: 'seller_001',
        name: 'Inactive Seller',
        is_verified: true,
        is_active: false,
        rating: 4.5,
        commission_rate: 0.15,
      };

      service.setSeller(seller);

      const result = await service.validateSeller('seller_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('should reject seller with low rating', async () => {
      const seller: Seller = {
        id: 'seller_001',
        name: 'Low Rating Seller',
        is_verified: true,
        is_active: true,
        rating: 1.5,
        commission_rate: 0.15,
      };

      service.setSeller(seller);

      const result = await service.validateSeller('seller_001');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('rating');
    });

    it('should reject non-existent seller', async () => {
      const result = await service.validateSeller('non_existent_seller');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('Order History', () => {
    it('should retrieve order history for user', async () => {
      const items1: OrderItem[] = [
        { product_id: 'prod_001', quantity: 1, price: 50000 },
      ];

      const items2: OrderItem[] = [
        { product_id: 'prod_002', quantity: 2, price: 75000 },
      ];

      // Use unique user ID to avoid test data collision
      const testUserId = 'user_history_' + Date.now();
      
      await service.createOrder(testUserId, items1);
      await service.createOrder(testUserId, items2);
      await service.createOrder('user_other_' + Date.now(), items1);

      const history = await service.getOrderHistory(testUserId);

      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history.every(order => order.user_id === testUserId)).toBe(true);
    });

    it('should return empty history for user with no orders', async () => {
      const history = await service.getOrderHistory('user_no_orders');

      expect(history).toHaveLength(0);
    });
  });

  describe('Stock Management', () => {
    it('should correctly track stock availability', async () => {
      const initialStock = 100;
      service.setStock('prod_new', initialStock);

      const stockRecord = service.getStock('prod_new');

      expect(stockRecord?.stock).toBe(initialStock);
      expect(stockRecord?.reserved).toBe(0);
    });

    it('should prevent overselling with concurrent orders', async () => {
      service.setStock('prod_limited', 10);

      const items1: OrderItem[] = [
        { product_id: 'prod_limited', quantity: 7, price: 50000 },
      ];

      const items2: OrderItem[] = [
        { product_id: 'prod_limited', quantity: 5, price: 50000 },
      ];

      const result1 = await service.createOrder('user_001', items1);
      const result2 = await service.createOrder('user_002', items2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Insufficient stock');
    });
  });
});
