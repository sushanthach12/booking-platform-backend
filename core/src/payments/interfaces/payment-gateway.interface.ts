export interface IPaymentGateway {
  createPayment(orderId: string, amount: number, currency: string, customerDetails: CustomerDetails, options?: PaymentOptions): Promise<PaymentResponse>;
  getPaymentStatus(orderId: string): Promise<PaymentStatusResponse>;
  verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;
  refundPayment(orderId: string, amount?: number): Promise<RefundResponse>;
}

export interface CustomerDetails {
  customerId: string;
  email: string;
  name: string;
  phone?: string;
}

export interface PaymentOptions {
  returnUrl?: string;
  notifyUrl?: string;
  paymentMethods?: string[];
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  orderId: string;
  paymentLinkId?: string;
  paymentSessionId?: string;
  error?: string;
  expiresAt?: Date;
}

export interface PaymentStatusResponse {
  orderId: string;
  status: PaymentGatewayStatus;
  amount?: number;
  currency?: string;
  paymentId?: string;
  error?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  webhookData?: any;
  error?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  error?: string;
}

export enum PaymentGatewayStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}
