import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AvailabilityCache, IRedisService } from '../../common/redis';
import { BOOKING_REPOSITORY } from '../../database';
import {
  IPaymentService,
  PaymentCustomerDetails,
  PaymentResponse,
  PaymentStatus,
} from '../../payments/interfaces/payment.interface';
import { BookingEntity } from '../entities';
import { BookingPaymentStatus, BookingStatus } from '../enums';
import {
  AvailabilityResult,
  BookingQueryOptions,
  BookingResponse,
  CreateBookingRequest,
  PaginatedBookings,
} from '../interfaces/booking.interface';
import { IBookingRepository } from '../repositories';

const PAYMENT_CREATE_TIMEOUT_MS = 15000;
const AVAILABILITY_CACHE_TTL_MS = 300_000; // 5 minutes

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
  ) {}

  async createBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<BookingResponse> {
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
      return this.mapToResponse(existingBooking);
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
          totalPrice: createBookingRequest.expectedTotalPrice || 0,
          currency: 'USD',
          status: BookingStatus.PENDING,
          paymentStatus: BookingPaymentStatus.PENDING,
          idempotencyKey: createBookingRequest.idempotencyKey,
          specialRequests: createBookingRequest.specialRequests,
          guestCount: createBookingRequest.guestCount,
        };

        const entity = manager.create(BookingEntity, bookingData);

        await manager.save(entity);

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
        amount: createBookingRequest.expectedTotalPrice || 0,
        currency: 'INR',
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
      const updatedBooking = await this.bookingRepository.update(booking.id, {
        paymentTransactionId: paymentResponse.transactionId,
      });

      this.logger.log(
        `Booking created successfully: ${booking.id} with payment transaction: ${paymentResponse.transactionId}`,
      );

      const response = this.mapToResponse(updatedBooking);

      response.paymentTransactionId = paymentResponse.transactionId;

      return response;
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

  async getBookingById(bookingId: string): Promise<BookingResponse> {
    this.logger.log(`Getting booking by ID: ${bookingId}`);

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    return this.mapToResponse(booking);
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

  async confirmBooking(bookingId: string): Promise<BookingResponse> {
    this.logger.log(`Confirming booking ${bookingId}`);

    const booking = await this.bookingRepository.findByIdWithLock(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    const updatedBooking = await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    this.logger.log(`Booking ${bookingId} confirmed successfully`);
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
    const upper = status?.toLocaleLowerCase() ?? '';
    if (upper === PaymentStatus.SUCCESS) return BookingPaymentStatus.SUCCEEDED;
    if (upper === PaymentStatus.FAILED || upper === PaymentStatus.CANCELLED) {
      return BookingPaymentStatus.FAILED;
    }
    return BookingPaymentStatus.PENDING;
  }

  async checkAvailability(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<AvailabilityResult> {
    this.logger.log(`Checking availability for property ${propertyId}`);

    const overlappingBookings =
      await this.bookingRepository.findOverlappingBookings(
        propertyId,
        checkInDate,
        checkOutDate,
      );

    const available = overlappingBookings.length === 0;
    const result: AvailabilityResult = {
      available,
      conflictingBookings: overlappingBookings.map((booking) => booking.id),
    };

    await this.setAvailabilityCache(
      propertyId,
      checkInDate,
      checkOutDate,
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

  private mapToResponse(booking: BookingEntity): BookingResponse {
    return {
      id: booking.id,
      propertyId: booking.propertyId,
      guestId: booking.guestId,
      hostId: booking.hostId,
      roomId: booking.roomId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights: booking.numberOfNights,
      totalPrice: booking.totalPrice,
      currency: booking.currency,
      status: booking.status as BookingStatus,
      paymentStatus: booking.paymentStatus as BookingPaymentStatus,
      paymentIntentId: booking.paymentIntentId,
      paymentTransactionId: booking.paymentTransactionId,
      specialRequests: booking.specialRequests,
      guestCount: booking.guestCount,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      confirmedAt: booking.confirmedAt,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
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
