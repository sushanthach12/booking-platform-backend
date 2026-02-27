/**
 * Financial summary for a booking (subtotal, tax, grand total).
 * Used by pricing calculator and booking creation.
 */
export interface BookingSummary {
  subtotal: number;
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
