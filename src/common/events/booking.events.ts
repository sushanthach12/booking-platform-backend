export const BOOKING_CONFIRMED = 'booking.confirmed';
export const BOOKING_CANCELLED = 'booking.cancelled';
export const BOOKING_PAYMENT_FAILED = 'booking.payment.failed';

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
