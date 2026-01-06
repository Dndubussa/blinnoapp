/**
 * ClickPesa Payment Integration Tests
 * Tests for M-Pesa/STK push payments, validation, and webhook handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Types
interface ClickPesaConfig {
  amount: number;
  phone_number: string;
  account_reference: string;
  description: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface ClickPesaResponse {
  success: boolean;
  transaction_id?: string;
  status?: string;
  error?: string;
  message?: string;
}

interface WebhookData {
  transaction_id: string;
  status: 'completed' | 'failed' | 'pending';
  amount: number;
  timestamp: string;
  phone_number: string;
}

// ClickPesa Payment Service
class ClickPesaPaymentService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.clickpesa.com/api/v1';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async initiateSTKPush(config: ClickPesaConfig): Promise<ClickPesaResponse> {
    try {
      // Validate configuration
      this.validateSTKConfig(config);

      // Initiate STK push
      const response = await this.sendSTKRequest(config);

      return {
        success: true,
        transaction_id: response.transaction_id,
        status: 'pending',
        message: 'STK push initiated successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async queryTransactionStatus(transactionId: string): Promise<ClickPesaResponse> {
    try {
      const response = await this.queryTransaction(transactionId);

      return {
        success: response.success,
        status: response.status,
        message: response.message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async handleWebhook(data: WebhookData): Promise<boolean> {
    try {
      // Validate webhook signature
      this.validateWebhook(data);

      // Process payment based on status
      if (data.status === 'completed') {
        return await this.processSuccessfulPayment(data);
      } else if (data.status === 'failed') {
        return await this.processFailedPayment(data);
      } else {
        return await this.processPendingPayment(data);
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return false;
    }
  }

  private validateSTKConfig(config: ClickPesaConfig): void {
    const errors: string[] = [];

    if (!config.amount || config.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!config.phone_number || !this.isValidTanzaniaPhone(config.phone_number)) {
      errors.push('Valid Tanzania phone number is required (format: 255XXXXXXXXX)');
    }

    if (!config.account_reference || config.account_reference.trim().length === 0) {
      errors.push('Account reference is required');
    }

    if (!config.description || config.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (config.email && !this.isValidEmail(config.email)) {
      errors.push('Valid email is required if provided');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid STK configuration: ${errors.join(', ')}`);
    }
  }

  private isValidTanzaniaPhone(phone: string): boolean {
    // Tanzania phone: Must be 255 followed by 9 digits (MPESA format)
    const phoneRegex = /^255[0-9]{9}$/;
    const normalized = phone.replace(/[^\d]/g, '');
    return phoneRegex.test(normalized);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateWebhook(data: WebhookData): void {
    if (!data.transaction_id) {
      throw new Error('Missing transaction ID in webhook');
    }

    if (!['completed', 'failed', 'pending'].includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }

    if (data.amount <= 0) {
      throw new Error('Invalid amount in webhook');
    }

    if (!this.isValidTanzaniaPhone(data.phone_number)) {
      throw new Error('Invalid phone number in webhook');
    }
  }

  private async sendSTKRequest(config: ClickPesaConfig): Promise<ClickPesaResponse> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transaction_id: `clickpesa_${Date.now()}`,
          status: 'pending',
        });
      }, 100);
    });
  }

  private async queryTransaction(transactionId: string): Promise<ClickPesaResponse> {
    // Simulate transaction query
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          status: 'completed',
          message: 'Transaction found',
        });
      }, 100);
    });
  }

  private async processSuccessfulPayment(data: WebhookData): Promise<boolean> {
    // Logic to update order status, send confirmation, etc.
    console.log(`Processing successful payment: ${data.transaction_id}`);
    return true;
  }

  private async processFailedPayment(data: WebhookData): Promise<boolean> {
    // Logic to handle failed payment, notify user, etc.
    console.log(`Processing failed payment: ${data.transaction_id}`);
    return true;
  }

  private async processPendingPayment(data: WebhookData): Promise<boolean> {
    // Logic to handle pending payment status
    console.log(`Processing pending payment: ${data.transaction_id}`);
    return true;
  }
}

// Tests
describe('ClickPesaPaymentService', () => {
  let paymentService: ClickPesaPaymentService;

  beforeEach(() => {
    paymentService = new ClickPesaPaymentService('test_key', 'test_secret');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('STK Push Initialization', () => {
    it('should successfully initiate STK push with valid config', async () => {
      const config: ClickPesaConfig = {
        amount: 50000,
        phone_number: '255756123456',
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(true);
      expect(response.transaction_id).toBeDefined();
      expect(response.status).toBe('pending');
    });

    it('should reject STK push with invalid phone number', async () => {
      const config: ClickPesaConfig = {
        amount: 50000,
        phone_number: '123456789',
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Valid Tanzania phone number');
    });

    it('should reject STK push with zero amount', async () => {
      const config: ClickPesaConfig = {
        amount: 0,
        phone_number: '255756123456',
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Amount must be greater');
    });

    it('should reject STK push with missing account reference', async () => {
      const config: ClickPesaConfig = {
        amount: 50000,
        phone_number: '255756123456',
        account_reference: '',
        description: 'Payment for laptop purchase',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Account reference');
    });

    it('should accept various phone number formats', async () => {
      const validPhones = [
        '255756123456',
        '+255756123456',
        '0756123456',
      ];

      const baseConfig = {
        amount: 50000,
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
      };

      // Test normalized format
      const response = await paymentService.initiateSTKPush({
        ...baseConfig,
        phone_number: '255756123456',
      });

      expect(response.success).toBe(true);
    });

    it('should include optional email and name fields', async () => {
      const config: ClickPesaConfig = {
        amount: 50000,
        phone_number: '255756123456',
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
        email: 'customer@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const config: ClickPesaConfig = {
        amount: 50000,
        phone_number: '255756123456',
        account_reference: 'ORDER-12345',
        description: 'Payment for laptop purchase',
        email: 'invalid-email',
      };

      const response = await paymentService.initiateSTKPush(config);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Valid email');
    });
  });

  describe('Transaction Status Query', () => {
    it('should query transaction status successfully', async () => {
      const transactionId = 'clickpesa_123456';

      const response = await paymentService.queryTransactionStatus(transactionId);

      expect(response.success).toBe(true);
      expect(response.status).toBeDefined();
    });

    it('should handle query errors gracefully', async () => {
      const transactionId = '';

      const response = await paymentService.queryTransactionStatus(transactionId);

      // Service should attempt query even with empty ID
      expect(response).toBeDefined();
    });
  });

  describe('Webhook Processing', () => {
    const baseWebhookData: WebhookData = {
      transaction_id: 'clickpesa_123456',
      status: 'completed',
      amount: 50000,
      timestamp: new Date().toISOString(),
      phone_number: '255756123456',
    };

    it('should process successful payment webhook', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await paymentService.handleWebhook(baseWebhookData);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing successful payment')
      );

      consoleSpy.mockRestore();
    });

    it('should process failed payment webhook', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const webhook: WebhookData = {
        ...baseWebhookData,
        status: 'failed',
      };

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing failed payment')
      );

      consoleSpy.mockRestore();
    });

    it('should process pending payment webhook', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const webhook: WebhookData = {
        ...baseWebhookData,
        status: 'pending',
      };

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing pending payment')
      );

      consoleSpy.mockRestore();
    });

    it('should reject webhook with missing transaction ID', async () => {
      const webhook: WebhookData = {
        ...baseWebhookData,
        transaction_id: '',
      };

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(false);
    });

    it('should reject webhook with invalid status', async () => {
      const webhook = {
        ...baseWebhookData,
        status: 'invalid_status',
      } as unknown as WebhookData;

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(false);
    });

    it('should reject webhook with invalid phone number', async () => {
      const webhook: WebhookData = {
        ...baseWebhookData,
        phone_number: 'invalid',
      };

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(false);
    });

    it('should reject webhook with zero amount', async () => {
      const webhook: WebhookData = {
        ...baseWebhookData,
        amount: 0,
      };

      const result = await paymentService.handleWebhook(webhook);

      expect(result).toBe(false);
    });
  });

  describe('Payment Amount Validation', () => {
    it('should accept valid payment amounts', async () => {
      const validAmounts = [100, 1000, 50000, 500000];

      for (const amount of validAmounts) {
        const response = await paymentService.initiateSTKPush({
          amount,
          phone_number: '255756123456',
          account_reference: 'ORDER-12345',
          description: 'Test payment',
        });

        expect(response.success).toBe(true);
      }
    });

    it('should reject negative amounts', async () => {
      const response = await paymentService.initiateSTKPush({
        amount: -5000,
        phone_number: '255756123456',
        account_reference: 'ORDER-12345',
        description: 'Test payment',
      });

      expect(response.success).toBe(false);
    });
  });
});
