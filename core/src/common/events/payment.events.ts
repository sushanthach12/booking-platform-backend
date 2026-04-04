/**
 * Payment domain events. Shared so PaymentModule can emit and BookingModule can
 * listen without circular dependency.
 */
export const PAYMENT_STATUS_UPDATED = 'payment.status.updated';

export interface PaymentStatusUpdatedPayload {
  transactionId: string;
  status: string;
}
