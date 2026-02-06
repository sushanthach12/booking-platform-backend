import { BookingEntity } from '../entities';
import { BookingStatus, PaymentStatus } from '../enums';

export interface BaseBookingOptions {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
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
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedBookingsResult {
  bookings: BookingEntity[];
  total: number;
  page: number;
  limit: number;
}
