import { BookingPaymentStatus, BookingStatus,  } from '../enums';

export interface CreateBookingRequest {
  propertyId: string;
  roomId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  specialRequests?: string;
  idempotencyKey: string;
  expectedTotalPrice?: number;
}

export interface BookingResponse {
  id: string;
  propertyId: string;
  guestId: string;
  hostId: string;
  roomId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  paymentIntentId?: string;
  specialRequests?: string;
  guestCount: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingQueryOptions {
  propertyId?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedBookings {
  bookings: BookingResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface AvailabilityResult {
  available: boolean;
  conflictingBookings: string[];
}

export interface CancelBookingOptions {
  reason?: string;
  isHost?: boolean;
}
