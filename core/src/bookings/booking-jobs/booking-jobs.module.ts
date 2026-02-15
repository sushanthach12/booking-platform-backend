import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { BookingModule } from '../booking.module';
import { BookingPaymentTimeoutProcessor } from './processors/booking-payment-timeout.processor';
import { PaymentStatusSyncProcessor } from './processors/payment-status-sync.processor';

@Module({
  imports: [QueuesModule, BookingModule],
  providers: [BookingPaymentTimeoutProcessor, PaymentStatusSyncProcessor],
})
export class BookingJobsModule {}
