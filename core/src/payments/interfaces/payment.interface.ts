export interface IPaymentService {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentResult>;
  cancelPayment(paymentIntentId: string): Promise<PaymentResult>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(paymentIntentId: string): Promise<PaymentStatus>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  clientSecret?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  status: PaymentStatus;
  error?: string;
  processedAt: Date;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  error?: string;
  processedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

export interface CreatePaymentOptions {
  amount: number;
  currency: string;
  bookingId: string;
  guestId: string;
  propertyId: string;
  metadata?: Record<string, any>;
}
