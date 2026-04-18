import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { BookingModule } from '../booking.module';
import { CreateBookingDetailsProcessor } from './processors/create-booking-details.processor';
import { BookingPaymentTimeoutProcessor } from './processors/booking-payment-timeout.processor';
import { PaymentStatusSyncProcessor } from './processors/payment-status-sync.processor';

@Module({
  imports: [QueuesModule, BookingModule],
  providers: [
    BookingPaymentTimeoutProcessor,
    PaymentStatusSyncProcessor,
    CreateBookingDetailsProcessor,
  ],
})
export class BookingJobsModule {}
