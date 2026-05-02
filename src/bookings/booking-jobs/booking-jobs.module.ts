import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesModule } from '../../queues/queues.module';
import { BookingModule } from '../booking.module';
import { BookingEntity } from '../entities';
import { BookingCompletionProcessor } from './processors/booking-completion.processor';
import { BookingPaymentTimeoutProcessor } from './processors/booking-payment-timeout.processor';
import { CreateBookingDetailsProcessor } from './processors/create-booking-details.processor';
import { PaymentStatusSyncProcessor } from './processors/payment-status-sync.processor';

@Module({
  imports: [
    QueuesModule,
    BookingModule,
    TypeOrmModule.forFeature([BookingEntity]),
  ],
  providers: [
    BookingPaymentTimeoutProcessor,
    PaymentStatusSyncProcessor,
    CreateBookingDetailsProcessor,
    BookingCompletionProcessor,
  ],
})
export class BookingJobsModule {}
