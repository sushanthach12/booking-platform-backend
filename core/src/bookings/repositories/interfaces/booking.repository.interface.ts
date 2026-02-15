import { EntityManager } from 'typeorm';
import {
  BaseBookingOptions,
  FindBookingsOptions,
  PaginatedBookingsResult,
  PropertyBookingOptions,
} from '../../dto/booking-options.dto';
import { BookingEntity } from '../../entities';
import { BookingStatus } from '../../enums';

export interface IBookingRepository {
  // Basic CRUD operations
  create(booking: Partial<BookingEntity>): Promise<BookingEntity>;
  findById(id: string): Promise<BookingEntity | null>;
  findByIdWithLock(id: string): Promise<BookingEntity | null>;
  update(id: string, data: Partial<BookingEntity>): Promise<BookingEntity>;
  delete(id: string): Promise<void>;

  // Find operations with filters
  findByGuestId(
    guestId: string,
    options?: BaseBookingOptions,
  ): Promise<BookingEntity[]>;

  findByHostId(
    hostId: string,
    options?: BaseBookingOptions,
  ): Promise<BookingEntity[]>;

  findByPropertyId(
    propertyId: string,
    options?: PropertyBookingOptions,
  ): Promise<BookingEntity[]>;

  // Availability checking
  findOverlappingBookings(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string,
  ): Promise<BookingEntity[]>;

  /** Overlap check with pessimistic lock; must be called inside an active transaction */
  findOverlappingBookingsWithLock(
    manager: EntityManager,
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<BookingEntity[]>;

  // Idempotency
  findByIdempotencyKey(idempotencyKey: string): Promise<BookingEntity | null>;

  // Payment lookups
  findByPaymentIntentId(paymentIntentId: string): Promise<BookingEntity | null>;
  findByPaymentTransactionId(
    paymentTransactionId: string,
  ): Promise<BookingEntity | null>;

  // Date range queries
  findBookingsInDateRange(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: BookingStatus[],
  ): Promise<BookingEntity[]>;

  // Count operations
  countByGuestId(guestId: string, status?: BookingStatus): Promise<number>;
  countByHostId(hostId: string, status?: BookingStatus): Promise<number>;
  countByPropertyId(
    propertyId: string,
    status?: BookingStatus,
  ): Promise<number>;
  countBookingsCreatedInMonth(year: number, month: number): Promise<number>;

  // Pagination
  findWithPagination(
    options: FindBookingsOptions,
  ): Promise<PaginatedBookingsResult>;
}
