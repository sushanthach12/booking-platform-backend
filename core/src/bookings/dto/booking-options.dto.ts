import { BookingEntity } from '../entities';
import { BookingPaymentStatus, BookingStatus } from '../enums';

export interface BaseBookingOptions {
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  limit?: number;
  offset?: number;
}

export interface PropertyBookingOptions extends BaseBookingOptions {
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FindBookingsOptions extends PaginationOptions {
  guestId?: string;
  hostId?: string;
  propertyId?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedBookingsResult {
  bookings: BookingEntity[];
  total: number;
  page: number;
  limit: number;
}
