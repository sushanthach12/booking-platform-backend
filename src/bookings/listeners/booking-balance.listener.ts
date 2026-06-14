import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BALANCE_SERVICE } from '../../database/di/symbols';
import {
  BOOKING_COMPLETED,
  BookingCompletedPayload,
} from '../../common/events/booking.events';
import type { IBalanceService } from '../../payments/interfaces/balance.service.interface';

/**
 * Credits the host's earnings when a booking completes. Decoupled from the
 * completion worker via the BOOKING_COMPLETED event (mirrors the email-listener
 * pattern), so the booking domain never depends on the balance domain directly.
 * The credit itself is idempotent in BalanceService.
 */
@Injectable()
export class BookingBalanceListener {
  private readonly logger = new Logger(BookingBalanceListener.name);

  constructor(
    @Inject(BALANCE_SERVICE)
    private readonly balanceService: IBalanceService,
  ) {}

  @OnEvent(BOOKING_COMPLETED)
  async handleBookingCompleted(
    payload: BookingCompletedPayload,
  ): Promise<void> {
    this.logger.log(
      `Crediting earning for completed booking ${payload.bookingId}`,
    );
    await this.balanceService.creditBookingEarning(payload.bookingId);
  }
}
