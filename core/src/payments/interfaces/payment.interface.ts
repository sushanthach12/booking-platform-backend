// Main Payment Service Interface
export interface IPaymentService {
  createPayment(
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<PaymentResponse>;
  
  getPaymentId(transactionId: string): Promise<string | null>;
  
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;
  
  handleWebhook(
    gatewayType: PaymentGatewayType,
    payload: any,
    signature: string,
  ): Promise<WebhookResult>;
  
  terminatePayment(transactionId: string): Promise<boolean>;
}

// Customer Details
export interface PaymentCustomerDetails {
  customerId: string;
  email: string;
  name: string;
  phone?: string;
}

// Payment Options
export interface PaymentOptions {
  bookingId?: string;
  guestId?: string;
  propertyId?: string;
  returnUrl?: string;
  notifyUrl?: string;
  paymentMethods?: string[];
  metadata?: Record<string, any>;
}

// Payment Response
export interface PaymentResponse {
  transactionId: string;
  paymentLink?: string;
  paymentSessionId?: string;
  success: boolean;
  error?: string;
  expiresAt?: Date;
}

// Payment Status Response
export interface PaymentStatusResponse {
  status: string;
  gatewayStatus?: string;
  paymentId?: string;
}

// Webhook Result
export interface WebhookResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Payment Gateway Types
export enum PaymentGatewayType {
  CASHFREE = 'cashfree',
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

// Gateway-specific interfaces (kept separate as they're implementation details)
export interface IPaymentGateway {
  createPayment(orderId: string, amount: number, currency: string, customerDetails: PaymentCustomerDetails, options?: PaymentOptions): Promise<GatewayPaymentResponse>;
  getPaymentStatus(orderId: string): Promise<GatewayStatusResponse>;
  verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;
  refundPayment(orderId: string, amount?: number): Promise<RefundResponse>;
  terminatePayment(orderId: string): Promise<boolean>;
}

export interface GatewayPaymentResponse {
  success: boolean;
  orderId: string;
  paymentLinkId?: string;
  paymentSessionId?: string;
  error?: string;
  expiresAt?: Date;
}

export interface GatewayStatusResponse {
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
