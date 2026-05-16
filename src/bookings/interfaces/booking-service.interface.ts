import type { BookingPaymentStatus } from '../enums';
import type {
  BookingQueryOptions,
  BookingResponse,
  CheckBookingAvailabilityRequest,
  CheckBookingAvailabilityResponse,
  CheckoutPreviewRequest,
  CheckoutPreviewResponse,
  CreateBookingApiResponse,
  CreateBookingRequest,
  IConfirmBookingParams,
  IGetBookingDetailsParams,
  IGetBookingDetailsResponse,
  PaginatedBookings,
} from './booking.interface';

/**
 * Abstraction for the booking domain service.
 * Enables testing with mocks and swapping implementations without changing consumers.
 */
export interface IBookingService {
  createBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<CreateBookingApiResponse>;

  getBookingDetails(
    data: IGetBookingDetailsParams,
  ): Promise<IGetBookingDetailsResponse>;

  getGuestBookingsSummary(userId: string): Promise<{
    upcomingCount: number;
    pastCount: number;
    totalSpent: number;
    currency: string;
    uniqueLocations: number;
  }>;

  getBookings(
    userId: string,
    query: BookingQueryOptions,
    isHost?: boolean,
  ): Promise<PaginatedBookings>;

  cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    isHost?: boolean,
  ): Promise<BookingResponse>;

  confirmBooking(data: IConfirmBookingParams): Promise<BookingResponse>;

  updatePaymentStatus(
    bookingId: string,
    paymentStatus: BookingPaymentStatus,
    paymentIntentId?: string,
  ): Promise<BookingResponse>;

  expireUnpaidBookingIfStillPending(
    bookingId: string,
    paymentTransactionId: string,
  ): Promise<boolean>;

  syncPaymentStatusFromTransaction(
    transactionId: string,
    paymentStatus: string,
  ): Promise<void>;

  getBookingStatus(
    bookingId: string,
    userId: string,
  ): Promise<{ status: string; paymentStatus: string }>;

  checkAvailability(
    data: CheckBookingAvailabilityRequest,
  ): Promise<CheckBookingAvailabilityResponse>;

  previewCheckout(
    request: CheckoutPreviewRequest,
    userId: string,
  ): Promise<CheckoutPreviewResponse>;

  retryPayment(
    bookingId: string,
    userId: string,
  ): Promise<{ paymentSessionId: string; paymentLink: string }>;
}

/**
 * Financial summary for a booking (subtotal, tax, grand total).
 * Used by pricing calculator and booking creation.
 */
export interface BookingSummary {
  basePricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalFees: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Abstraction for calculating booking price summary.
 * Enables different pricing strategies (e.g. by region, currency) without changing BookingService.
 */
export interface IBookingPriceCalculator {
  calculate(
    propertyId: string,
    roomId: string | undefined,
    numberOfNights: number,
  ): Promise<BookingSummary>;
}

/**
 * Parameters for availability check (cache + calendar).
 * Overlap check remains in BookingService inside the transaction.
 */
export interface IAvailabilityCheckParams {
  propertyId: string;
  roomId: string | null;
  checkInDate: Date;
  checkOutDate: Date;
}

/**
 * Abstraction for availability checks (cache + calendar) and cache invalidation.
 * Overlap check with lock stays in BookingService.
 */
export interface IAvailabilityChecker {
  /**
   * Throws ConflictException if any date in range is unavailable (cache or calendar).
   */
  checkAvailable(params: IAvailabilityCheckParams): Promise<void>;

  /**
   * Store availability result in cache for the date range.
   */
  setAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    available: boolean,
    price?: number,
  ): Promise<void>;

  /**
   * Invalidate cache keys for the date range (e.g. after booking create/cancel).
   */
  invalidateAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void>;

  /**
   * Return list of dates in [startDate, endDate) (end exclusive).
   */
  getDatesInRange(startDate: Date, endDate: Date): Date[];
}
