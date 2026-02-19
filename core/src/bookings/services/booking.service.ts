import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import moment from 'moment';
import { DataSource } from 'typeorm';
import { ECurrency } from '../../common/enums/currency.enum';
import { AvailabilityCache, IRedisService } from '../../common/redis';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  BOOKING_REPOSITORY,
} from '../../database';
import {
  IPaymentService,
  PaymentCustomerDetails,
  PaymentResponse,
  PaymentStatus,
} from '../../payments/interfaces/payment.interface';
import { IAvailabilityCalendarRepository } from '../../properties/repositories/interfaces/availability-calendar.repository.interface';
import { PropertyService } from '../../properties/services/property.service';
import {
  QUEUE_BOOKING_DETAILS,
  QUEUE_BOOKING_PAYMENT_TIMEOUT,
} from '../../queues/queues.module';
import { UserService } from '../../users/services/user.service';
import {
  JOB_CREATE_BOOKING_DETAILS,
  JOB_EXPIRE_UNPAID_BOOKING,
  PAYMENT_TIMEOUT_MS,
} from '../booking-jobs/constants';
import { BookingEntity } from '../entities';
import { BookingPaymentStatus, BookingStatus } from '../enums';
import {
  AvailabilityResult,
  BookingQueryOptions,
  BookingResponse,
  CheckBookingAvailabilityRequest,
  CheckBookingAvailabilityResponse,
  CreateBookingApiResponse,
  CreateBookingRequest,
  IConfirmBookingParams,
  IGetBookingDetailsParams,
  IGetBookingDetailsResponse,
  PaginatedBookings,
} from '../interfaces/booking.interface';
import { IBookingRepository } from '../repositories';

const PAYMENT_CREATE_TIMEOUT_MS = 15000;
const AVAILABILITY_CACHE_TTL_MS = 300_000; // 5 minutes
const TAX_RATE_PERCENT = 18;

export interface BookingSummary {
  subtotal: number;
  totalFees: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly dataSource: DataSource,
    @Inject('IRedisService')
    private readonly redisService: IRedisService,
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
    @InjectQueue(QUEUE_BOOKING_PAYMENT_TIMEOUT)
    private readonly bookingPaymentTimeoutQueue: Queue,
    @InjectQueue(QUEUE_BOOKING_DETAILS)
    private readonly bookingDetailsQueue: Queue,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
    private readonly userService: UserService,
    private readonly propertyService: PropertyService,
  ) {}

  async createBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<CreateBookingApiResponse> {
    this.logger.log(
      `Creating booking for property ${createBookingRequest.propertyId} by user ${userId}`,
    );

    // Check for idempotency first
    const existingBooking = await this.bookingRepository.findByIdempotencyKey(
      createBookingRequest.idempotencyKey,
    );
    if (existingBooking) {
      this.logger.log(
        `Booking already exists with idempotency key: ${createBookingRequest.idempotencyKey}`,
      );
      // Client already has payment link from first response; return empty so they use cached link
      return this.toCreateBookingApiResponse(existingBooking, '', '');
    }

    // Validate dates
    if (createBookingRequest.checkInDate >= createBookingRequest.checkOutDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const numberOfNights = this.calculateNights(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate,
    );

    const summary = await this.calculateBookingSummary(
      createBookingRequest.propertyId,
      createBookingRequest.roomId,
      numberOfNights,
    );

    // Step 1: Check availability in Redis cache for full date range (fast path)
    const datesInRange = this.getDatesInRange(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate,
    );

    const availabilityCacheKeys = datesInRange.map(
      (d) =>
        `property:${createBookingRequest.propertyId}:availability:${d.toISOString().split('T')[0]}`,
    );

    const cachedValues = await this.redisService.getMany(availabilityCacheKeys);

    for (let i = 0; i < cachedValues.length; i++) {
      const raw = cachedValues[i];
      if (raw) {
        const availability: AvailabilityCache = JSON.parse(raw);
        if (!availability.available) {
          throw new ConflictException(
            'Property is not available for the selected dates',
          );
        }
      }
    }

    // Check availability calendar: reject if any date in range is explicitly blocked
    const calendarRows = await this.availabilityCalendarRepository.findByRange({
      propertyId: createBookingRequest.propertyId,
      roomId: createBookingRequest.roomId ?? null,
      startDate: createBookingRequest.checkInDate,
      endDate: createBookingRequest.checkOutDate,
    });
    const calendarByDate = new Map<string, { available: boolean }>(
      calendarRows.map((r) => [
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date).split('T')[0],
        { available: r.available },
      ]),
    );
    for (const d of datesInRange) {
      const key = d.toISOString().split('T')[0];
      const row = calendarByDate.get(key);
      if (row && !row.available) {
        throw new ConflictException(
          'Property is not available for the selected dates',
        );
      }
    }

    // Step 2: Acquire distributed lock (short hold: overlap check + insert only)
    const lockKey = `lock:property:${createBookingRequest.propertyId}:${createBookingRequest.checkInDate.toISOString().split('T')[0]}:${createBookingRequest.checkOutDate.toISOString().split('T')[0]}`;
    const lockValue = await this.redisService.acquireLock(lockKey, 30000);

    if (!lockValue) {
      throw new ConflictException(
        'Property is currently being booked by another user. Please try again.',
      );
    }

    let paymentResponse: PaymentResponse | null = null;
    let createdBookingId: string | null = null;

    try {
      // Step 3: Transaction with pessimistic lock: overlap check + insert (lock released before payment)
      const booking = await this.dataSource.transaction(async (manager) => {
        const overlappingBookings =
          await this.bookingRepository.findOverlappingBookingsWithLock(
            manager,
            createBookingRequest.propertyId,
            createBookingRequest.checkInDate,
            createBookingRequest.checkOutDate,
          );

        if (overlappingBookings.length > 0) {
          throw new ConflictException(
            'Property is not available for the selected dates',
          );
        }

        const bookingId = randomUUID();
        const bookingData: Partial<BookingEntity> = {
          id: bookingId,
          propertyId: createBookingRequest.propertyId,
          guestId: userId,
          hostId: hostId,
          roomId: createBookingRequest.roomId,
          checkInDate: createBookingRequest.checkInDate,
          checkOutDate: createBookingRequest.checkOutDate,
          numberOfNights,
          guestCount: createBookingRequest.guestCount,
          subtotal: summary.subtotal,
          totalFees: summary.totalFees,
          taxRate: summary.taxRate,
          taxAmount: summary.taxAmount,
          totalDiscount: summary.totalDiscount,
          grandTotal: summary.grandTotal,
          currency: ECurrency.INR,
          status: BookingStatus.PENDING,
          paymentStatus: BookingPaymentStatus.PENDING,
          idempotencyKey: createBookingRequest.idempotencyKey,
          specialRequests: createBookingRequest.specialRequests,
        };

        const entity = manager.create(BookingEntity, bookingData);

        await manager.save(entity);

        // Block dates in availability calendar for this booking (same transaction)
        const availabilityRows = datesInRange.map((date) => ({
          propertyId: createBookingRequest.propertyId,
          roomId: createBookingRequest.roomId ?? null,
          date: new Date(date),
          available: false,
          bookingId: entity.id,
        }));
        await this.availabilityCalendarRepository.upsertMany(
          availabilityRows,
          manager,
        );

        return entity;
      });

      createdBookingId = booking.id;

      // Step 4: Create payment after releasing lock (with timeout)
      const customerDetails: PaymentCustomerDetails = {
        customerId: userId,
        email: createBookingRequest.customerEmail ?? '',
        name: createBookingRequest.customerName ?? '',
        phone: createBookingRequest.customerPhone ?? '',
      };

      const paymentOptions = {
        amount: summary.grandTotal,
        currency: ECurrency.INR,
        bookingId: booking.id,
        guestId: userId,
        propertyId: createBookingRequest.propertyId,
        metadata: {
          bookingId: booking.id,
          propertyId: createBookingRequest.propertyId,
          guestId: userId,
          numberOfNights,
        },
      };

      try {
        paymentResponse = await this.createPaymentWithTimeout(
          paymentOptions.amount,
          paymentOptions.currency,
          customerDetails,
          paymentOptions,
        );
      } catch (error) {
        this.logger.error(`Failed to create payment: ${error.message}`);
        throw new BadRequestException(
          error.message ?? 'Unable to process payment. Please try again.',
        );
      }

      if (!paymentResponse) {
        throw new BadRequestException(
          'Unable to process payment. Please try again.',
        );
      }

      // Step 5: Attach payment transaction to booking
      let updatedBooking = await this.bookingRepository.update(booking.id, {
        paymentTransactionId: paymentResponse.transactionId,
      });

      // Step 6: Generate booking number (BKYYYYMM-NNNN)
      const created = new Date(updatedBooking.createdAt);
      const year = created.getFullYear();
      const month = created.getMonth() + 1;
      const count = await this.bookingRepository.countBookingsCreatedInMonth(
        year,
        month,
      );
      const bookingNumber = `BK${year}${String(month).padStart(2, '0')}-${String(count).padStart(4, '0')}`;
      updatedBooking = await this.bookingRepository.update(updatedBooking.id, {
        bookingNumber,
      });

      await this.bookingPaymentTimeoutQueue.add(
        JOB_EXPIRE_UNPAID_BOOKING,
        {
          bookingId: updatedBooking.id,
          paymentTransactionId: paymentResponse.transactionId,
        },
        { delay: PAYMENT_TIMEOUT_MS },
      );

      this.bookingDetailsQueue
        .add(JOB_CREATE_BOOKING_DETAILS, { bookingId: updatedBooking.id })
        .catch((err) =>
          this.logger.warn(
            `Failed to enqueue booking details job: ${err?.message ?? err}`,
          ),
        );

      this.logger.log(
        `Booking created successfully: ${booking.id} with payment transaction: ${paymentResponse.transactionId}`,
      );

      return this.toCreateBookingApiResponse(
        updatedBooking,
        paymentResponse.paymentLink ?? '',
        paymentResponse.paymentSessionId ?? '',
      );
    } catch (error) {
      if (paymentResponse) {
        try {
          await this.paymentService.terminatePayment(
            paymentResponse.transactionId,
          );
          this.logger.log(
            `Cancelled payment intent due to booking creation failure`,
          );
        } catch (cancelError) {
          this.logger.error(
            `Failed to cancel payment intent: ${cancelError.message}`,
          );
        }
      }

      if (createdBookingId && !paymentResponse) {
        try {
          await this.bookingRepository.update(createdBookingId, {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Payment failed',
          });
        } catch (updateError) {
          this.logger.error(
            `Failed to mark booking ${createdBookingId} as cancelled: ${updateError.message}`,
          );
        }
      }

      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
      await this.invalidateAvailabilityCache(
        createBookingRequest.propertyId,
        createBookingRequest.checkInDate,
        createBookingRequest.checkOutDate,
      );
    }
  }

  private createPaymentWithTimeout(
    amount: number,
    currency: string,
    customerDetails: PaymentCustomerDetails,
    options: {
      amount: number;
      currency: string;
      bookingId: string;
      guestId: string;
      propertyId: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<PaymentResponse> {
    return Promise.race([
      this.paymentService.createPayment(
        amount,
        currency,
        customerDetails,
        options,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new BadRequestException(
                'Payment request timed out. Please try again.',
              ),
            ),
          PAYMENT_CREATE_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  async getBookingDetails(
    data: IGetBookingDetailsParams,
  ): Promise<IGetBookingDetailsResponse> {
    const { query, user } = data;

    const booking = await this.bookingRepository.findById(query.bookingId);

    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${query.bookingId} not found`,
      );
    }

    if (booking.guestId !== user.id && booking.hostId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to access this booking',
      );
    }

    const [snapshot, hostProfile, guestProfile] = await Promise.all([
      this.bookingRepository.findSnapshotByBookingId(booking.id),
      this.userService.getProfile(booking.hostId),
      this.userService.getProfile(booking.guestId),
    ]);

    const paymentStatus = booking.paymentStatus as BookingPaymentStatus;
    const status = booking.status as BookingStatus;
    const requiresHostConfirmation =
      paymentStatus === BookingPaymentStatus.SUCCEEDED &&
      status === BookingStatus.PENDING;

    const summary = {
      subtotal: Number(booking.subtotal ?? 0),
      totalFees: Number(booking.totalFees ?? 0),
      taxRate: Number(booking.taxRate ?? 0),
      taxAmount: Number(booking.taxAmount ?? 0),
      totalDiscount: Number(booking.totalDiscount ?? 0),
      grandTotal: Number(booking.grandTotal ?? 0),
      currency: booking.currency,
    };

    const response: IGetBookingDetailsResponse = {
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: booking.numberOfNights,
        currency: booking.currency,
        status,
        paymentStatus,
        specialRequests: booking.specialRequests,
        guestCount: booking.guestCount,
        cancellationReason: booking.cancellationReason,
        cancelledAt: booking.cancelledAt,
        confirmedAt: booking.confirmedAt,
        completedAt: booking.completedAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        requiresHostConfirmation,
      },
      summary,
      property: {
        id: booking.propertyId,
        title: snapshot?.propertyTitle ?? 'Property',
        description: null,
        location: snapshot?.propertyAddress
          ? {
              addressLine1: snapshot.propertyAddress.addressLine1,
              addressLine2: snapshot.propertyAddress.addressLine2,
              city: snapshot.propertyAddress.city,
              state: snapshot.propertyAddress.state,
              country: snapshot.propertyAddress.country,
              postalCode: snapshot.propertyAddress.postalCode,
              latitude: snapshot.propertyAddress.latitude,
              longitude: snapshot.propertyAddress.longitude,
            }
          : undefined,
        images:
          snapshot?.propertyImage != null
            ? [
                {
                  url: snapshot.propertyImage,
                  displayOrder: 0,
                  isPrimary: true,
                },
              ]
            : undefined,
        amenities: undefined,
        room: snapshot?.roomName
          ? {
              name: snapshot.roomName,
              roomType: '',
              beds: 0,
              maxGuests: 0,
              isPrivate: false,
              hasBathroom: false,
              hasBalcony: false,
            }
          : undefined,
        cancellationPolicy: snapshot?.cancellationPolicy,
        houseRules: snapshot?.houseRules,
      },
      host: {
        id: hostProfile.id,
        name: hostProfile.name,
        email: hostProfile.email,
        phone: hostProfile.phone,
      },
      guest: {
        id: guestProfile.id,
        name: guestProfile.name,
        email: guestProfile.email,
        phone: guestProfile.phone,
      },
    };

    return response;
  }

  async getBookings(
    userId: string,
    query: BookingQueryOptions,
    isHost: boolean = false,
  ): Promise<PaginatedBookings> {
    this.logger.log(`Getting bookings for user ${userId}, isHost: ${isHost}`);

    const options = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      status: query.status,
      paymentStatus: query.paymentStatus,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const result = await this.bookingRepository.findWithPagination({
      ...options,
      ...(isHost ? { hostId: userId } : { guestId: userId }),
    });

    return {
      bookings: result.bookings.map((booking) => this.mapToResponse(booking)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    isHost: boolean = false,
  ): Promise<BookingResponse> {
    this.logger.log(`Cancelling booking ${bookingId} by user ${userId}`);

    const booking = await this.bookingRepository.findByIdWithLock(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Check permissions
    if (isHost && booking.hostId !== userId) {
      throw new BadRequestException(
        'You can only cancel bookings for your properties',
      );
    }
    if (!isHost && booking.guestId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Update booking
    const updatedBooking = await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date(),
    });

    this.logger.log(`Booking ${bookingId} cancelled successfully`);
    return this.mapToResponse(updatedBooking);
  }

  async confirmBooking(data: IConfirmBookingParams): Promise<BookingResponse> {
    const { query, user } = data;

    const booking = await this.bookingRepository.findByIdWithLock(
      query.bookingId,
    );

    if (!booking) {
      throw new NotFoundException(`Booking not found`);
    }

    if (booking.hostId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to confirm this booking',
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    const updatedBooking = await this.bookingRepository.update(
      query.bookingId,
      {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    );

    return this.mapToResponse(updatedBooking);
  }

  async updatePaymentStatus(
    bookingId: string,
    paymentStatus: BookingPaymentStatus,
    paymentIntentId?: string,
  ): Promise<BookingResponse> {
    this.logger.log(
      `Updating payment status for booking ${bookingId} to ${paymentStatus}`,
    );

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    const updateData: Partial<BookingEntity> = {
      paymentStatus,
    };

    if (paymentIntentId) {
      updateData.paymentIntentId = paymentIntentId;
    }

    // Auto-confirm booking if payment succeeds
    if (
      paymentStatus === BookingPaymentStatus.SUCCEEDED &&
      booking.status === BookingStatus.PENDING
    ) {
      updateData.status = BookingStatus.CONFIRMED;
      updateData.confirmedAt = new Date();
    }

    const updatedBooking = await this.bookingRepository.update(
      bookingId,
      updateData,
    );

    this.logger.log(`Payment status updated for booking ${bookingId}`);
    return this.mapToResponse(updatedBooking);
  }

  /**
   * Called from payment webhook listener (event-based) to avoid circular dependency.
   * Finds booking by paymentTransactionId and updates payment status.
   */
  /**
   * Called from booking-payment-timeout queue processor. Expires the booking if
   * still PENDING and terminates the payment. No-op if already paid/cancelled.
   */
  async expireUnpaidBookingIfStillPending(
    bookingId: string,
    paymentTransactionId: string,
  ): Promise<boolean> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) return false;
    if (
      booking.status !== BookingStatus.PENDING ||
      booking.paymentStatus !== BookingPaymentStatus.PENDING
    ) {
      return false;
    }
    try {
      await this.paymentService.terminatePayment(paymentTransactionId);
    } catch (err) {
      this.logger.warn(
        `Failed to terminate payment ${paymentTransactionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      paymentStatus: BookingPaymentStatus.FAILED,
      cancellationReason: 'Payment window expired',
      cancelledAt: new Date(),
    });
    this.logger.log(`Expired unpaid booking ${bookingId}`);
    return true;
  }

  async syncPaymentStatusFromTransaction(
    transactionId: string,
    paymentStatus: string,
  ): Promise<void> {
    const booking =
      await this.bookingRepository.findByPaymentTransactionId(transactionId);
    if (!booking) {
      this.logger.debug(
        `No booking found for payment transaction ${transactionId}, skipping sync`,
      );
      return;
    }
    const status = this.mapPaymentTransactionStatusToBooking(paymentStatus);
    await this.updatePaymentStatus(booking.id, status);
  }

  private mapPaymentTransactionStatusToBooking(
    status: string,
  ): BookingPaymentStatus {
    const normalized = String(status ?? '').toLowerCase();
    if (normalized === PaymentStatus.SUCCESS) {
      return BookingPaymentStatus.SUCCEEDED;
    }
    if (
      normalized === PaymentStatus.FAILED ||
      normalized === PaymentStatus.CANCELLED ||
      normalized === PaymentStatus.REFUNDED ||
      normalized === PaymentStatus.PARTIALLY_REFUNDED
    ) {
      return BookingPaymentStatus.FAILED;
    }
    return BookingPaymentStatus.PENDING;
  }

  async checkAvailability(
    data: CheckBookingAvailabilityRequest,
  ): Promise<CheckBookingAvailabilityResponse> {
    // validate the check out date to be greater than the check in date
    const checkInDate = moment(data.checkInDate)
      .startOf('day')
      .toDate()
      .getDate();
    const checkOutDate = moment(data.checkOutDate)
      .startOf('day')
      .toDate()
      .getDate();

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check out date must be greater than check in date',
      );
    }

    const datesInRange = this.getDatesInRange(
      data.checkInDate,
      data.checkOutDate,
    );

    const [overlappingBookings, calendarRows] = await Promise.all([
      this.bookingRepository.findOverlappingBookings(
        data.propertyId,
        data.checkInDate,
        data.checkOutDate,
      ),
      this.availabilityCalendarRepository.findByRange({
        propertyId: data.propertyId,
        roomId: data.roomId ?? null,
        startDate: data.checkInDate,
        endDate: data.checkOutDate,
      }),
    ]);

    const hasOverlap = overlappingBookings.length > 0;
    const calendarByDate = new Map<string, boolean>(
      calendarRows.map((r) => {
        const key =
          r.date instanceof Date
            ? r.date.toISOString().split('T')[0]
            : String(r.date).split('T')[0];
        return [key, r.available];
      }),
    );
    const hasBlockedDate = datesInRange.some((d) => {
      const key = d.toISOString().split('T')[0];
      return calendarByDate.get(key) === false;
    });

    const available = !hasOverlap && !hasBlockedDate;
    const result: AvailabilityResult = {
      available,
      conflictingBookings: overlappingBookings.map((booking) => booking.id),
    };

    await this.setAvailabilityCache(
      data.propertyId,
      data.checkInDate,
      data.checkOutDate,
      available,
    );

    return result;
  }

  private async setAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    available: boolean,
    price: number = 0,
  ): Promise<void> {
    const dates = this.getDatesInRange(checkInDate, checkOutDate);
    const value: AvailabilityCache = { available, price };
    const serialized = JSON.stringify(value);

    await Promise.all(
      dates.map((d) => {
        const key = `property:${propertyId}:availability:${d.toISOString().split('T')[0]}`;
        return this.redisService.set(
          key,
          serialized,
          AVAILABILITY_CACHE_TTL_MS,
        );
      }),
    );
  }

  private calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Calculates booking financial summary from property pricing.
   * Tax (18%) is applied after all discounts.
   */
  private async calculateBookingSummary(
    propertyId: string,
    roomId: string | undefined,
    numberOfNights: number,
  ): Promise<BookingSummary> {
    const propertyDetails = await this.propertyService.getPropertyDetails({
      params: { propertyId, includeRelations: true },
    });

    let basePricePerNight: number;
    if (roomId && propertyDetails.rooms?.length) {
      const room = propertyDetails.rooms.find((r) => r.id === roomId);
      basePricePerNight =
        room?.basePrice ?? Number(propertyDetails.pricing?.basePrice ?? 0);
    } else {
      basePricePerNight = Number(propertyDetails.pricing?.basePrice ?? 0);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const subtotal = round2(basePricePerNight * numberOfNights);
    const totalFees = 0;
    const totalDiscount = 0;
    const amountAfterDiscount = round2(subtotal - totalDiscount);
    const taxAmount = round2(amountAfterDiscount * (TAX_RATE_PERCENT / 100));
    const grandTotal = round2(amountAfterDiscount + taxAmount);

    return {
      subtotal,
      totalFees,
      totalDiscount,
      taxRate: TAX_RATE_PERCENT,
      taxAmount,
      grandTotal,
    };
  }

  private toCreateBookingApiResponse(
    booking: BookingEntity,
    paymentLink = '',
    paymentSessionId = '',
  ): CreateBookingApiResponse {
    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber ?? '',
      paymentLink,
      paymentSessionId,
    };
  }

  private mapToResponse(booking: BookingEntity): BookingResponse {
    const paymentStatus = booking.paymentStatus as BookingPaymentStatus;
    const status = booking.status as BookingStatus;
    const requiresHostConfirmation =
      paymentStatus === BookingPaymentStatus.SUCCEEDED &&
      status === BookingStatus.PENDING;
    return {
      id: booking.id,
      propertyId: booking.propertyId,
      guestId: booking.guestId,
      hostId: booking.hostId,
      roomId: booking.roomId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights: booking.numberOfNights,
      totalPrice: Number(booking.grandTotal ?? 0),
      currency: booking.currency,
      status,
      paymentStatus,
      bookingNumber: booking.bookingNumber,
      specialRequests: booking.specialRequests,
      guestCount: booking.guestCount,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      confirmedAt: booking.confirmedAt,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      requiresHostConfirmation,
    };
  }

  private async invalidateAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void> {
    const dates = this.getDatesInRange(checkInDate, checkOutDate);
    const keys = dates.map(
      (d) =>
        `property:${propertyId}:availability:${d.toISOString().split('T')[0]}`,
    );
    await this.redisService.delMany(keys);
  }

  private getDatesInRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
