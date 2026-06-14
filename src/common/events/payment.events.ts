/**
 * Payment domain events. Shared so PaymentModule can emit and BookingModule can
 * listen without circular dependency.
 */
export const PAYMENT_STATUS_UPDATED = 'payment.status.updated';

export interface PaymentStatusUpdatedPayload {
  transactionId: string;
  status: string;
}

export const PAYOUT_PAID = 'payout.paid';
export const PAYOUT_FAILED = 'payout.failed';

export interface PayoutPaidPayload {
  payoutId: string;
  hostId: string;
  amount: number;
  currency: string;
  transferUtr: string | null;
}

export interface PayoutFailedPayload {
  payoutId: string;
  hostId: string;
  amount: number;
  currency: string;
  reason: string;
}
