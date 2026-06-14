import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const QUEUE_BOOKING_PAYMENT_TIMEOUT = 'booking-payment-timeout';
export const QUEUE_PAYMENT_STATUS_SYNC = 'payment-status-sync';
export const QUEUE_BOOKING_DETAILS = 'booking-details';
export const QUEUE_BOOKING_COMPLETION = 'booking-completion';
export const QUEUE_BALANCE_RELEASE = 'balance-release';
export const QUEUE_PAYOUT_DISPATCH = 'payout-dispatch';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_BOOKING_PAYMENT_TIMEOUT },
      { name: QUEUE_PAYMENT_STATUS_SYNC },
      { name: QUEUE_BOOKING_DETAILS },
      { name: QUEUE_BOOKING_COMPLETION },
      { name: QUEUE_BALANCE_RELEASE },
      { name: QUEUE_PAYOUT_DISPATCH },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
