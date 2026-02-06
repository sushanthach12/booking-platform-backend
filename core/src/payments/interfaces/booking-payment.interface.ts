import { BookingResponse } from '../../bookings/interfaces/booking.interface';

export interface BookingPaymentLinkResponse {
  paymentLink: string;
  paymentIntentId: string;
  expiresAt: Date;
  amount: number;
  currency: string;
}

export interface CreateBookingWithPaymentRequest {
  propertyId: string;
  roomId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  specialRequests?: string;
  idempotencyKey: string;
  expectedTotalPrice?: number;
  skipPayment?: boolean; // For admin bookings or special cases
}

export interface ConfirmBookingRequest {
  paymentIntentId: string;
  bookingId?: string; // Optional if payment intent already has bookingId
}

export interface ConfirmBookingResponse {
  success: boolean;
  booking?: BookingResponse;
  error?: string;
}
