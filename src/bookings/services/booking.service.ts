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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import moment from 'moment';
import { DataSource } from 'typeorm';
import { ECurrency } from '../../common/enums/currency.enum';
import {
  BOOKING_CANCELLED,
  BOOKING_CONFIRMED,
  BOOKING_PAYMENT_FAILED,
} from '../../common/events/booking.events';
import { IRedisService } from '../../common/redis';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  AVAILABILITY_CHECKER,
  BOOKING_PRICE_CALCULATOR,
  BOOKING_REPOSITORY,
  REDIS_SERVICE,
} from '../../database';
import {
  IPaymentService,
  PaymentCustomerDetails,
  PaymentResponse,
  PaymentStatus,
} from '../../payments/interfaces/payment.interface';
import { IAvailabilityCalendarRepository } from '../../properties/repositories/interfaces/availability-calendar.repository.interface';
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
import { PaymentMethod } from '../enums/payment-method.enum';
import type {
  IAvailabilityChecker,
  IBookingPriceCalculator,
  IBookingService,
} from '../interfaces/booking-service.interface';
import {
  AvailabilityResult,
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
} from '../interfaces/booking.interface';
import { IBookingRepository } from '../repositories';

const PAYMENT_CREATE_TIMEOUT_MS = 15000;

export type { BookingSummary } from '../interfaces/booking-service.interface';

@Injectable()
export class BookingService implements IBookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly dataSource: DataSource,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
    @InjectQueue(QUEUE_BOOKING_PAYMENT_TIMEOUT)
    private readonly bookingPaymentTimeoutQueue: Queue,
    @InjectQueue(QUEUE_BOOKING_DETAILS)
    private readonly bookingDetailsQueue: Queue,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
    @Inject(BOOKING_PRICE_CALCULATOR)
    private readonly priceCalculator: IBookingPriceCalculator,
    @Inject(AVAILABILITY_CHECKER)
    private readonly availabilityChecker: IAvailabilityChecker,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<CreateBookingApiResponse> {
    this.logger.log(
      `Creating booking for property ${createBookingRequest.propertyId} by user ${userId}`,
    );

    // ── Quote token validation (optional — if provided, verify expiry and lock in grandTotal) ──
    let quotedGrandTotal: number | null = null;
    if (createBookingRequest.quoteToken) {
      try {
        const decoded = await this.jwtService.verifyAsync<{
          grandTotal: number;
        }>(createBookingRequest.quoteToken);
        quotedGrandTotal = decoded.grandTotal;
        this.logger.debug(
          `Quote token verified for booking of property ${createBookingRequest.propertyId}, quoted grandTotal: ${quotedGrandTotal}`,
        );
      } catch {
        throw new BadRequestException(
          'Price quote has expired. Please go back and refresh the price.',
        );
      }
    }

    // ── Pay at check-in: skip Cashfree entirely, confirm immediately ──────────
    if (createBookingRequest.paymentMethod === PaymentMethod.PAY_AT_CHECKIN) {
      return this.createPayAtCheckinBooking(
        createBookingRequest,
        userId,
        hostId,
      );
    }

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

    const summary = await this.priceCalculator.calculate(
      createBookingRequest.propertyId,
      createBookingRequest.roomId,
      numberOfNights,
    );

    // Validate that the quoted price matches the current price (within ₹1 tolerance for floating point)
    if (
      quotedGrandTotal !== null &&
      Math.abs(quotedGrandTotal - summary.grandTotal) > 1
    ) {
      throw new ConflictException(
        'The price has changed since your quote. Please go back and refresh to get the updated price.',
      );
    }

    // Step 1: Check availability (cache + calendar) via checker
    await this.availabilityChecker.checkAvailable({
      propertyId: createBookingRequest.propertyId,
      roomId: createBookingRequest.roomId ?? null,
      checkInDate: createBookingRequest.checkInDate,
      checkOutDate: createBookingRequest.checkOutDate,
    });

    const datesInRange = this.availabilityChecker.getDatesInRange(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate,
    );

    // Step 2: Acquire distributed lock (short hold: overlap check + insert only)
    const lockKey = `lock:property:${createBookingRequest.propertyId}`;
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
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to process payment. Please try again.';
        this.logger.error(`Failed to create payment: ${message}`);
        throw new BadRequestException(message);
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

      // Step 6: Generate booking number (BKYYYYMM-NNNN) using a DB sequence to avoid race conditions
      const created = new Date(updatedBooking.createdAt);
      const year = created.getFullYear();
      const month = created.getMonth() + 1;
      const [{ nextval }] = await this.dataSource.query<[{ nextval: string }]>(
        `SELECT nextval('booking_number_seq')`,
      );
      const bookingNumber = `BK${year}${String(month).padStart(2, '0')}-${String(nextval).padStart(4, '0')}`;
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
            `Failed to cancel payment intent: ${cancelError instanceof Error ? cancelError.message : String(cancelError)}`,
          );
        }
      }

      if (createdBookingId && !paymentResponse) {
        try {
          await this.bookingRepository.update(createdBookingId, {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Payment failed',
          });
          await this.restoreAvailabilityCalendar(
            createBookingRequest.propertyId,
            createBookingRequest.roomId ?? null,
            datesInRange,
          );
        } catch (updateError) {
          this.logger.error(
            `Failed to mark booking ${createdBookingId} as cancelled: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          );
        }
      }

      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
      await this.availabilityChecker.invalidateAvailabilityCache(
        createBookingRequest.propertyId,
        createBookingRequest.checkInDate,
        createBookingRequest.checkOutDate,
      );
    }
  }

  /**
   * Creates a booking where the guest pays at the property on check-in.
   * Skips Cashfree entirely and immediately confirms the booking.
   * Uses the same availability locking and calendar-blocking logic as online bookings.
   */
  private async createPayAtCheckinBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<CreateBookingApiResponse> {
    this.logger.log(
      `Creating pay-at-checkin booking for property ${createBookingRequest.propertyId}`,
    );

    // Idempotency
    const existingBooking = await this.bookingRepository.findByIdempotencyKey(
      createBookingRequest.idempotencyKey,
    );
    if (existingBooking) {
      return this.toCreateBookingApiResponse(existingBooking, '', '');
    }

    if (createBookingRequest.checkInDate >= createBookingRequest.checkOutDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const numberOfNights = this.calculateNights(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate,
    );

    const summary = await this.priceCalculator.calculate(
      createBookingRequest.propertyId,
      createBookingRequest.roomId,
      numberOfNights,
    );

    await this.availabilityChecker.checkAvailable({
      propertyId: createBookingRequest.propertyId,
      roomId: createBookingRequest.roomId ?? null,
      checkInDate: createBookingRequest.checkInDate,
      checkOutDate: createBookingRequest.checkOutDate,
    });

    const datesInRange = this.availabilityChecker.getDatesInRange(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate,
    );

    const lockKey = `lock:property:${createBookingRequest.propertyId}`;
    const lockValue = await this.redisService.acquireLock(lockKey, 30000);

    if (!lockValue) {
      throw new ConflictException(
        'Property is currently being booked by another user. Please try again.',
      );
    }

    try {
      const now = new Date();
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
        const entity = manager.create(BookingEntity, {
          id: bookingId,
          propertyId: createBookingRequest.propertyId,
          guestId: userId,
          hostId,
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
          // Immediately confirmed — no payment gateway required
          status: BookingStatus.CONFIRMED,
          paymentStatus: BookingPaymentStatus.PENDING,
          confirmedAt: now,
          idempotencyKey: createBookingRequest.idempotencyKey,
          specialRequests: createBookingRequest.specialRequests,
        } satisfies Partial<BookingEntity>);

        await manager.save(entity);

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

      // Generate booking number using a DB sequence to avoid race conditions
      const created = new Date(booking.createdAt);
      const year = created.getFullYear();
      const month = created.getMonth() + 1;
      const [{ nextval }] = await this.dataSource.query<[{ nextval: string }]>(
        `SELECT nextval('booking_number_seq')`,
      );
      const bookingNumber = `BK${year}${String(month).padStart(2, '0')}-${String(nextval).padStart(4, '0')}`;
      const updatedBooking = await this.bookingRepository.update(booking.id, {
        bookingNumber,
      });

      // Snapshot job (no timeout job — booking is already confirmed)
      this.bookingDetailsQueue
        .add(JOB_CREATE_BOOKING_DETAILS, { bookingId: updatedBooking.id })
        .catch((err) =>
          this.logger.warn(
            `Failed to enqueue booking details job: ${err?.message ?? err}`,
          ),
        );

      this.logger.log(
        `Pay-at-checkin booking created and confirmed: ${updatedBooking.id}`,
      );

      return this.toCreateBookingApiResponse(updatedBooking, '', '');
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
      await this.availabilityChecker.invalidateAvailabilityCache(
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

  async getBookingStatus(
    bookingId: string,
    userId: string,
  ): Promise<{ status: string; paymentStatus: string }> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.guestId !== userId && booking.hostId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to access this booking',
      );
    }

    return { status: booking.status, paymentStatus: booking.paymentStatus };
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

  async getGuestBookingsSummary(userId: string): Promise<{
    upcomingCount: number;
    pastCount: number;
    totalSpent: number;
    currency: string;
    uniqueLocations: number;
  }> {
    return this.bookingRepository.getGuestSummary(userId);
  }

  async getBookings(
    userId: string,
    query: BookingQueryOptions,
    isHost: boolean = false,
  ): Promise<PaginatedBookings> {
    this.logger.log(`Getting bookings for user ${userId}, isHost: ${isHost}`);

    const tabStatuses: Record<string, BookingStatus[]> = {
      upcoming: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      past: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    };

    const options = {
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      status: query.tab ? undefined : query.status,
      statuses: query.tab ? tabStatuses[query.tab] : undefined,
      paymentStatus: query.paymentStatus,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const result = await this.bookingRepository.findWithPagination({
      ...options,
      ...(isHost ? { hostId: userId } : { guestId: userId }),
    });

    const bookings = result.bookings.map((booking) => this.mapToResponse(booking));
    const totalPages = Math.ceil(result.total / result.limit);
    return {
      bookings,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
        length: bookings.length,
      },
    };
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    isHost: boolean = false,
  ): Promise<BookingResponse> {
    this.logger.log(`Cancelling booking ${bookingId} by user ${userId}`);

    const updatedBooking = await this.dataSource.transaction(
      async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .setLock('pessimistic_write')
          .where('booking.id = :id', { id: bookingId })
          .getOne();

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
          throw new BadRequestException(
            'You can only cancel your own bookings',
          );
        }

        // Check if booking can be cancelled
        if (booking.status === BookingStatus.CANCELLED) {
          throw new BadRequestException('Booking is already cancelled');
        }
        if (booking.status === BookingStatus.COMPLETED) {
          throw new BadRequestException('Cannot cancel a completed booking');
        }

        const now = new Date();
        await manager.update(BookingEntity, bookingId, {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
        });

        return {
          ...booking,
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
          _needsRefund:
            booking.status === BookingStatus.CONFIRMED &&
            booking.paymentStatus === BookingPaymentStatus.SUCCEEDED &&
            !!booking.paymentTransactionId,
        } as BookingEntity & { _needsRefund: boolean };
      },
    );

    // Initiate refund for confirmed, paid bookings that are now cancelled
    const { _needsRefund, ...cancelledBooking } =
      updatedBooking as BookingEntity & {
        _needsRefund: boolean;
      };
    if (_needsRefund && cancelledBooking.paymentTransactionId) {
      this.logger.warn(
        `Booking ${bookingId} was paid and confirmed — initiating refund for transaction ${cancelledBooking.paymentTransactionId}`,
      );
      try {
        await this.paymentService.terminatePayment(
          cancelledBooking.paymentTransactionId,
        );
      } catch (err) {
        this.logger.error(
          `Failed to initiate refund for booking ${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(`Booking ${bookingId} cancelled successfully`);

    // Emit cancellation event for email notification (fire-and-forget)
    try {
      const guest = await this.userService.findById(
        (cancelledBooking as BookingEntity).guestId,
      );
      if (guest) {
        this.eventEmitter.emit(BOOKING_CANCELLED, {
          bookingId,
          guestEmail: guest.email,
          guestName: guest.name,
          propertyTitle: (cancelledBooking as BookingEntity).propertyId,
          checkIn: (cancelledBooking as BookingEntity).checkInDate
            ?.toISOString()
            .substring(0, 10),
          checkOut: (cancelledBooking as BookingEntity).checkOutDate
            ?.toISOString()
            .substring(0, 10),
          reason,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit cancellation event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return this.mapToResponse(cancelledBooking as BookingEntity);
  }

  async confirmBooking(data: IConfirmBookingParams): Promise<BookingResponse> {
    const { query, user } = data;

    const updatedBooking = await this.dataSource.transaction(
      async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .setLock('pessimistic_write')
          .where('booking.id = :id', { id: query.bookingId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(`Booking not found`);
        }

        if (booking.hostId !== user.id) {
          throw new ForbiddenException(
            'You are not authorized to confirm this booking',
          );
        }

        if (booking.status !== BookingStatus.PENDING) {
          throw new BadRequestException(
            'Only pending bookings can be confirmed',
          );
        }

        const now = new Date();
        await manager.update(BookingEntity, query.bookingId, {
          status: BookingStatus.CONFIRMED,
          confirmedAt: now,
        });

        return {
          ...booking,
          status: BookingStatus.CONFIRMED,
          confirmedAt: now,
        } as BookingEntity;
      },
    );

    // Emit confirmation event for email notification (fire-and-forget)
    try {
      const guest = await this.userService.findById(updatedBooking.guestId);
      if (guest) {
        this.eventEmitter.emit(BOOKING_CONFIRMED, {
          bookingId: updatedBooking.id,
          guestEmail: guest.email,
          guestName: guest.name,
          propertyTitle: updatedBooking.propertyId,
          checkIn: updatedBooking.checkInDate?.toISOString().substring(0, 10),
          checkOut: updatedBooking.checkOutDate?.toISOString().substring(0, 10),
          totalAmount: Number(updatedBooking.grandTotal ?? 0),
          currency: updatedBooking.currency ?? 'INR',
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit confirmation event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

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
    // Restore availability calendar so the dates can be rebooked
    const datesInRange = this.availabilityChecker.getDatesInRange(
      booking.checkInDate,
      booking.checkOutDate,
    );
    await this.restoreAvailabilityCalendar(
      booking.propertyId,
      booking.roomId ?? null,
      datesInRange,
    );
    // Emit payment failed event for email notification (fire-and-forget)
    try {
      const guest = await this.userService.findById(booking.guestId);
      if (guest) {
        this.eventEmitter.emit(BOOKING_PAYMENT_FAILED, {
          bookingId,
          guestEmail: guest.email,
          guestName: guest.name,
          propertyTitle: booking.propertyId,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit payment failed event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

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
    // Do not apply payment status updates to bookings that are already in a terminal state.
    // A late webhook (e.g. user paid after the 15-min timeout) must not revive a cancelled booking.
    const terminalStatuses: BookingStatus[] = [
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(booking.status as BookingStatus)) {
      this.logger.warn(
        `Ignoring payment sync for booking ${booking.id} — already in terminal status: ${booking.status}`,
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
    const checkInDate = moment(data.checkInDate).startOf('day');
    const checkOutDate = moment(data.checkOutDate).startOf('day');

    if (checkOutDate.isBefore(checkInDate)) {
      throw new BadRequestException(
        'Check out date must be greater than check in date',
      );
    }

    const datesInRange = this.availabilityChecker.getDatesInRange(
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

    await this.availabilityChecker.setAvailabilityCache(
      data.propertyId,
      data.checkInDate,
      data.checkOutDate,
      available,
    );

    return result;
  }

  /**
   * Restores availability_calendar rows to available after a booking is cancelled.
   * Must be called whenever a PENDING booking transitions to CANCELLED or EXPIRED.
   */
  private async restoreAvailabilityCalendar(
    propertyId: string,
    roomId: string | null,
    datesInRange: Date[],
  ): Promise<void> {
    try {
      await this.availabilityCalendarRepository.upsertMany(
        datesInRange.map((date) => ({
          propertyId,
          roomId,
          date: new Date(date),
          available: true,
          bookingId: null,
        })),
      );
    } catch (err) {
      this.logger.error(
        `Failed to restore availability calendar: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
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

  /**
   * Lightweight read-only price preview. Does NOT create a booking or lock any slot.
   * Returns a signed quoteToken (10-min TTL) that can be passed to createBooking
   * to validate the quoted price.
   */
  async previewCheckout(
    request: CheckoutPreviewRequest,
    _userId: string,
  ): Promise<CheckoutPreviewResponse> {
    void _userId; // for future personalization logic
    if (request.checkInDate >= request.checkOutDate) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const numberOfNights = this.calculateNights(
      request.checkInDate,
      request.checkOutDate,
    );

    // Availability check (cache only — no DB lock, no side effects)
    let available = true;
    try {
      await this.availabilityChecker.checkAvailable({
        propertyId: request.propertyId,
        roomId: request.roomId ?? null,
        checkInDate: request.checkInDate,
        checkOutDate: request.checkOutDate,
      });
    } catch {
      available = false;
    }

    const summary = await this.priceCalculator.calculate(
      request.propertyId,
      request.roomId,
      numberOfNights,
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const quoteToken = await this.jwtService.signAsync(
      {
        propertyId: request.propertyId,
        roomId: request.roomId,
        checkInDate: request.checkInDate.toISOString().split('T')[0],
        checkOutDate: request.checkOutDate.toISOString().split('T')[0],
        guestCount: request.guestCount,
        grandTotal: summary.grandTotal,
      },
      { expiresIn: '10m' },
    );

    return {
      quoteToken,
      propertyId: request.propertyId,
      checkInDate: request.checkInDate.toISOString().split('T')[0],
      checkOutDate: request.checkOutDate.toISOString().split('T')[0],
      numberOfNights,
      guestCount: request.guestCount,
      breakdown: {
        basePricePerNight: summary.basePricePerNight,
        subtotal: summary.subtotal,
        cleaningFee: summary.cleaningFee,
        serviceFee: summary.serviceFee,
        taxRate: summary.taxRate,
        taxAmount: summary.taxAmount,
        totalDiscount: summary.totalDiscount,
        grandTotal: summary.grandTotal,
        currency: ECurrency.INR,
      },
      expiresAt: expiresAt.toISOString(),
      availability: { available },
    };
  }

  /**
   * Retries payment for a PENDING booking whose previous Cashfree order failed or expired.
   * Does NOT create a new booking or re-check availability — the dates are already blocked.
   * Terminates the old payment order, issues a new Cashfree order, and re-enqueues the
   * payment timeout job so the 15-minute window resets.
   */
  async retryPayment(
    bookingId: string,
    userId: string,
  ): Promise<{ paymentSessionId: string; paymentLink: string }> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Only pending bookings can have their payment retried',
      );
    }

    // Terminate the previous payment order (fire-and-forget — it may already be expired)
    if (booking.paymentTransactionId) {
      try {
        await this.paymentService.terminatePayment(
          booking.paymentTransactionId,
        );
      } catch (err) {
        this.logger.warn(
          `Could not terminate old payment ${booking.paymentTransactionId} during retry: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const userProfile = await this.userService.getProfile(userId);

    const customerDetails: PaymentCustomerDetails = {
      customerId: userId,
      email: userProfile.email ?? '',
      name: userProfile.name ?? '',
      phone: userProfile.phone ?? '',
    };

    let paymentResponse: PaymentResponse;
    try {
      const grandTotal = Number(booking.grandTotal);
      paymentResponse = await this.createPaymentWithTimeout(
        grandTotal,
        booking.currency,
        customerDetails,
        {
          amount: grandTotal,
          currency: booking.currency,
          bookingId: booking.id,
          guestId: userId,
          propertyId: booking.propertyId,
          metadata: {
            bookingId: booking.id,
            propertyId: booking.propertyId,
            guestId: userId,
            numberOfNights: booking.numberOfNights,
          },
        },
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to process payment. Please try again.';
      throw new BadRequestException(message);
    }

    // Persist new transaction ID and reset payment status to PENDING
    await this.bookingRepository.update(bookingId, {
      paymentTransactionId: paymentResponse.transactionId,
      paymentStatus: BookingPaymentStatus.PENDING,
    });

    // Re-enqueue payment timeout job so the 15-minute window restarts
    await this.bookingPaymentTimeoutQueue.add(
      JOB_EXPIRE_UNPAID_BOOKING,
      { bookingId, paymentTransactionId: paymentResponse.transactionId },
      { delay: PAYMENT_TIMEOUT_MS },
    );

    this.logger.log(
      `Payment retried for booking ${bookingId}, new transaction: ${paymentResponse.transactionId}`,
    );

    return {
      paymentSessionId: paymentResponse.paymentSessionId ?? '',
      paymentLink: paymentResponse.paymentLink ?? '',
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
      propertyTitle: booking.snapshot?.propertyTitle,
      propertyImage: booking.snapshot?.propertyImage,
      locationLabel: booking.snapshot?.locationLabel,
    };
  }
}
