import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const QUEUE_BOOKING_PAYMENT_TIMEOUT = 'booking-payment-timeout';
export const QUEUE_PAYMENT_STATUS_SYNC = 'payment-status-sync';
export const QUEUE_BOOKING_DETAILS = 'booking-details';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_BOOKING_PAYMENT_TIMEOUT },
      { name: QUEUE_PAYMENT_STATUS_SYNC },
      { name: QUEUE_BOOKING_DETAILS },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
