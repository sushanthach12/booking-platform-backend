export const BOOKING_CONFIRMED = 'booking.confirmed';
export const BOOKING_CANCELLED = 'booking.cancelled';
export const BOOKING_PAYMENT_FAILED = 'booking.payment.failed';
export const BOOKING_COMPLETED = 'booking.completed';

export interface BookingConfirmedPayload {
  bookingId: string;
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currency: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}

export interface BookingPaymentFailedPayload {
  bookingId: string;
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
}

/**
 * Emitted once per booking when the completion sweep marks it COMPLETED.
 * Drives the earnings credit (see BalanceService.creditBookingEarning).
 * `completedAt` is a UTC instant.
 */
export interface BookingCompletedPayload {
  bookingId: string;
  hostId: string;
  hostNet: number;
  currency: string;
  completedAt: string;
}
