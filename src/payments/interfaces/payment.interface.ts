// Main Payment Service Interface
export interface IPaymentService {
  createPayment(
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<PaymentResponse>;

  getPaymentId(transactionId: string): Promise<string | null>;

  getPaymentLinkForTransaction(
    transactionId: string,
  ): Promise<{ paymentLink?: string; paymentSessionId?: string }>;

  getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

  handleWebhook(
    gatewayType: PaymentGatewayType,
    payload: any,
    signature: string,
    transactionId?: string,
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

// Transaction data (plain type for service layer; no entity leakage)
export interface IPaymentTransactionData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gatewayStatus?: string;
  gatewayType: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paymentLinkId?: string;
  paymentSessionId?: string;
  bookingId?: string;
  guestId: string;
  propertyId?: string;
  metadata?: Record<string, unknown>;
  webhookData?: Record<string, unknown>;
  errorMessage?: string;
  expiresAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// Gateway-specific interfaces (kept separate as they're implementation details)
export interface IPaymentGateway {
  createPayment(
    transactionId: string,
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options?: PaymentOptions,
  ): Promise<GatewayPaymentResponse>;
  getPaymentStatus(orderId: string): Promise<GatewayStatusResponse>;
  verifyWebhook(
    payload: any,
    signature: string,
  ): Promise<WebhookVerificationResult>;
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
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}
