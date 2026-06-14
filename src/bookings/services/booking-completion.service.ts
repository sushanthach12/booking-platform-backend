import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import {
  BOOKING_COMPLETED,
  BookingCompletedPayload,
} from '../../common/events/booking.events';
import { BookingEntity } from '../entities';
import { BookingStatus } from '../enums';

/**
 * Completion domain logic, decoupled from the queue plumbing. The scheduler
 * uses {@link findDueBookingIds} to keyset-paginate work; each worker calls
 * {@link completeBooking} for a single booking (idempotent + atomic).
 */
@Injectable()
export class BookingCompletionService {
  private readonly logger = new Logger(BookingCompletionService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * One keyset page of CONFIRMED bookings whose checkout has passed
   * (`checkOutDate <= now AND id > cursorId`), ordered by id. Sargable against
   * the `(status, checkOutDate)` index; never uses OFFSET.
   */
  async findDueBookingIds(
    now: Date,
    cursorId: string | null,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.bookingRepository.find({
      where: {
        status: BookingStatus.CONFIRMED,
        checkOutDate: LessThanOrEqual(now),
        ...(cursorId ? { id: MoreThan(cursorId) } : {}),
      },
      order: { id: 'ASC' },
      take: limit,
      select: ['id'],
    });
    return rows.map((b) => b.id);
  }

  /**
   * Mark a single booking COMPLETED and emit BOOKING_COMPLETED. Idempotent and
   * safe to run twice: the conditional `WHERE status = CONFIRMED` update is a
   * no-op (and emits nothing) if the booking was already completed or has since
   * been cancelled — so a re-delivery never double-credits the host.
   */
  async completeBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found; skipping completion`);
      return;
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      // Already completed, or cancelled meanwhile — silent skip, do NOT throw
      // (throwing would route a legit terminal booking to retries → DLQ).
      return;
    }

    const completedAt = new Date();
    const result = await this.bookingRepository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        status: BookingStatus.COMPLETED,
        completedAt,
        updatedAt: completedAt,
      })
      .where('id = :id AND status = :status', {
        id: bookingId,
        status: BookingStatus.CONFIRMED,
      })
      .execute();

    if (!result.affected) {
      // Lost the race to a concurrent cancel/complete — nothing to emit.
      return;
    }

    const grandTotal = Number(booking.grandTotal ?? 0);
    const platformFee = Number(booking.platformFee ?? 0);
    const hostNet =
      booking.hostNet != null
        ? Number(booking.hostNet)
        : Math.round((grandTotal - platformFee) * 100) / 100;

    const payload: BookingCompletedPayload = {
      bookingId,
      hostId: booking.hostId,
      hostNet,
      currency: booking.currency ?? 'INR',
      completedAt: completedAt.toISOString(),
    };
    this.eventEmitter.emit(BOOKING_COMPLETED, payload);
    this.logger.log(
      `Booking ${bookingId} completed; BOOKING_COMPLETED emitted`,
    );
  }
}
