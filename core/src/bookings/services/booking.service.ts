import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { BOOKING_REPOSITORY } from '../../database';
import { IBookingRepository } from '../repositories';
import { BookingEntity } from '../entities';
import {
  CreateBookingRequest,
  BookingResponse,
  BookingQueryOptions,
  PaginatedBookings,
  AvailabilityResult,
  CancelBookingOptions,
} from '../interfaces/booking.interface';
import { BookingPaymentStatus, BookingStatus } from '../enums';
import { IRedisService, AvailabilityCache } from '../../common/redis';
import { CreatePaymentOptions, IPaymentService, PaymentIntent } from '../../payments/interfaces/payment.interface';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly dataSource: DataSource,
    private readonly redisService: IRedisService,
    private readonly paymentService: IPaymentService,
  ) {}

  async createBooking(
    createBookingRequest: CreateBookingRequest,
    userId: string,
    hostId: string,
  ): Promise<BookingResponse> {
    this.logger.log(`Creating booking for property ${createBookingRequest.propertyId} by user ${userId}`);

    // Check for idempotency first
    const existingBooking = await this.bookingRepository.findByIdempotencyKey(
      createBookingRequest.idempotencyKey
    );
    if (existingBooking) {
      this.logger.log(`Booking already exists with idempotency key: ${createBookingRequest.idempotencyKey}`);
      return this.mapToResponse(existingBooking);
    }

    // Validate dates
    if (createBookingRequest.checkInDate >= createBookingRequest.checkOutDate) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const numberOfNights = this.calculateNights(
      createBookingRequest.checkInDate,
      createBookingRequest.checkOutDate
    );

    // Step 1: Check availability in Redis cache (fast path)
    const availabilityCacheKey = `property:${createBookingRequest.propertyId}:availability:${createBookingRequest.checkInDate.toISOString().split('T')[0]}`;
    const cachedAvailability = await this.redisService.get(availabilityCacheKey);
    
    if (cachedAvailability) {
      const availability: AvailabilityCache = JSON.parse(cachedAvailability);
      if (!availability.available) {
        throw new ConflictException('Property is not available for the selected dates');
      }
    }

    // Step 2: Acquire distributed lock
    const lockKey = `lock:property:${createBookingRequest.propertyId}:${createBookingRequest.checkInDate.toISOString().split('T')[0]}:${createBookingRequest.checkOutDate.toISOString().split('T')[0]}`;
    const lockValue = await this.redisService.acquireLock(lockKey, 30000); // 30 seconds TTL
    
    if (!lockValue) {
      throw new ConflictException('Property is currently being booked by another user. Please try again.');
    }

    let paymentIntent: PaymentIntent | null = null;

    try {
      // Step 3: Re-validate availability in database with pessimistic lock
      const overlappingBookings = await this.bookingRepository.findOverlappingBookings(
        createBookingRequest.propertyId,
        createBookingRequest.checkInDate,
        createBookingRequest.checkOutDate
      );

      if (overlappingBookings.length > 0) {
        throw new ConflictException('Property is not available for the selected dates');
      }

      // Step 4: Generate booking ID upfront for payment-first approach
      const bookingId = randomUUID();

      // Step 5: Create payment intent first (payment-first approach)
      const paymentOptions: CreatePaymentOptions = {
        amount: createBookingRequest.expectedTotalPrice || 0,
        currency: 'USD',
        bookingId: bookingId, // Use the generated booking ID
        guestId: userId,
        propertyId: createBookingRequest.propertyId,
        metadata: {
          bookingId: bookingId,
          propertyId: createBookingRequest.propertyId,
          guestId: userId,
          numberOfNights,
        },
      };

      try {
        paymentIntent = await this.paymentService.createPaymentIntent(
          paymentOptions.amount,
          paymentOptions.currency,
          paymentOptions.metadata
        );
      } catch (error) {
        this.logger.error(`Failed to create payment intent: ${error.message}`);
        throw new BadRequestException('Unable to process payment. Please try again.');
      }

      if(!paymentIntent) {
        throw new BadRequestException('Unable to process payment. Please try again.');
      }

      // Step 6: Create booking in database transaction with payment intent ID
      return await this.dataSource.transaction(async (manager) => {
        if(!paymentIntent) {
          throw new BadRequestException('Unable to process payment. Please try again.');
        }

        // Create booking record with payment intent ID and pre-generated ID
        const bookingData: Partial<BookingEntity> = {
          id: bookingId, // Use the pre-generated booking ID
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
          paymentIntentId: paymentIntent.id, // Set payment intent ID from the start
          idempotencyKey: createBookingRequest.idempotencyKey,
          specialRequests: createBookingRequest.specialRequests,
          guestCount: createBookingRequest.guestCount,
        };

        const booking = manager.create(BookingEntity, bookingData);
        await manager.save(booking);

        // Step 6: Update payment intent metadata with booking ID
        // Note: updatePaymentIntentMetadata not implemented in payment service yet
        // TODO: Implement this when payment service supports metadata updates
        // try {
        //   await this.paymentService.updatePaymentIntentMetadata(
        //     paymentIntent.id,
        //     {
        //       ...paymentOptions.metadata,
        //       bookingId: booking.id,
        //     }
        //   );
        // } catch (error) {
        //   this.logger.warn(`Failed to update payment intent metadata: ${error.message}`);
        //   // Non-critical error, continue with booking creation
        // }

        // Step 7: Update availability calendar atomically
        // TODO: Implement availability calendar update
        // await this.availabilityService.blockDates({
        //   propertyId: createBookingRequest.propertyId,
        //   checkInDate: createBookingRequest.checkInDate,
        //   checkOutDate: createBookingRequest.checkOutDate,
        //   bookingId: booking.id,
        // });

        this.logger.log(`Booking created successfully: ${booking.id} with payment intent: ${paymentIntent.id}`);
        
        const response = this.mapToResponse(booking);
        response.paymentIntentId = paymentIntent.id; // Include payment intent for frontend
        
        return response;
      });

    } catch (error) {
      // If booking creation fails, attempt to cancel the payment intent
      if (typeof paymentIntent === 'object' && paymentIntent !== null) {
        try {
          await this.paymentService.cancelPayment((paymentIntent as PaymentIntent)?.id);
          this.logger.log(`Cancelled payment intent ${(paymentIntent as PaymentIntent)?.id} due to booking creation failure`);
        } catch (cancelError) {
          this.logger.error(`Failed to cancel payment intent ${(paymentIntent as PaymentIntent)?.id}: ${cancelError.message}`);
        }
      }
      throw error;
    } finally {
      // Step 8: Release lock
      await this.redisService.releaseLock(lockKey, lockValue);
      
      // Step 9: Invalidate cache
      await this.invalidateAvailabilityCache(
        createBookingRequest.propertyId,
        createBookingRequest.checkInDate,
        createBookingRequest.checkOutDate
      );
    }
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
      bookings: result.bookings.map(booking => this.mapToResponse(booking)),
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
      throw new BadRequestException('You can only cancel bookings for your properties');
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
    this.logger.log(`Updating payment status for booking ${bookingId} to ${paymentStatus}`);

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
    if (paymentStatus === BookingPaymentStatus.SUCCEEDED && booking.status === BookingStatus.PENDING) {
      updateData.status = BookingStatus.CONFIRMED;
      updateData.confirmedAt = new Date();
    }

    const updatedBooking = await this.bookingRepository.update(bookingId, updateData);

    this.logger.log(`Payment status updated for booking ${bookingId}`);
    return this.mapToResponse(updatedBooking);
  }

  async checkAvailability(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<AvailabilityResult> {
    this.logger.log(`Checking availability for property ${propertyId}`);

    const overlappingBookings = await this.bookingRepository.findOverlappingBookings(
      propertyId,
      checkInDate,
      checkOutDate
    );

    return {
      available: overlappingBookings.length === 0,
      conflictingBookings: overlappingBookings.map(booking => booking.id),
    };
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
    checkOutDate: Date
  ): Promise<void> {
    const dates = this.getDatesInRange(checkInDate, checkOutDate);
    
    for (const date of dates) {
      const cacheKey = `property:${propertyId}:availability:${date.toISOString().split('T')[0]}`;
      await this.redisService.del(cacheKey);
    }
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
