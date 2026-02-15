import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PAYMENT_STATUS_UPDATED,
  PaymentStatusUpdatedPayload,
} from '../../common/events/payment.events';
import { BookingService } from '../services/booking.service';

/**
 * Listens for payment status updates from the payment module (webhook flow).
 * Updates the related booking so payment and booking stay in sync without
 * the payment module depending on the booking module.
 */
@Injectable()
export class BookingPaymentEventListener {
  private readonly logger = new Logger(BookingPaymentEventListener.name);

  constructor(private readonly bookingService: BookingService) {}

  @OnEvent(PAYMENT_STATUS_UPDATED)
  async handlePaymentStatusUpdated(
    payload: PaymentStatusUpdatedPayload,
  ): Promise<void> {
    try {
      await this.bookingService.syncPaymentStatusFromTransaction(
        payload.transactionId,
        payload.status,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync booking for payment ${payload.transactionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
