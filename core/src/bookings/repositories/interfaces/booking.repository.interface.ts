import { BookingEntity } from '../../entities';
import { BookingStatus } from '../../enums';
import { BaseBookingOptions, PropertyBookingOptions, FindBookingsOptions, PaginatedBookingsResult } from '../../dto/booking-options.dto';

export interface IBookingRepository {
  // Basic CRUD operations
  create(booking: Partial<BookingEntity>): Promise<BookingEntity>;
  findById(id: string): Promise<BookingEntity | null>;
  findByIdWithLock(id: string): Promise<BookingEntity | null>;
  update(id: string, data: Partial<BookingEntity>): Promise<BookingEntity>;
  delete(id: string): Promise<void>;
  
  // Find operations with filters
  findByGuestId(guestId: string, options?: BaseBookingOptions): Promise<BookingEntity[]>;
  
  findByHostId(hostId: string, options?: BaseBookingOptions): Promise<BookingEntity[]>;
  
  findByPropertyId(propertyId: string, options?: PropertyBookingOptions): Promise<BookingEntity[]>;
  
  // Availability checking
  findOverlappingBookings(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string
  ): Promise<BookingEntity[]>;
  
  // Idempotency
  findByIdempotencyKey(idempotencyKey: string): Promise<BookingEntity | null>;
  
  // Payment intent lookup
  findByPaymentIntentId(paymentIntentId: string): Promise<BookingEntity | null>;
  
  // Date range queries
  findBookingsInDateRange(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: BookingStatus[]
  ): Promise<BookingEntity[]>;
  
  // Count operations
  countByGuestId(guestId: string, status?: BookingStatus): Promise<number>;
  countByHostId(hostId: string, status?: BookingStatus): Promise<number>;
  countByPropertyId(propertyId: string, status?: BookingStatus): Promise<number>;
  
  // Pagination
  findWithPagination(options: FindBookingsOptions): Promise<PaginatedBookingsResult>;
}
