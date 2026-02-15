import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOOKING_REPOSITORY } from '../database';
import { PaymentModule } from '../payments/payment.module';
import { PropertyModule } from '../properties/property.module';
import { BookingController } from './controllers';
import {
  BookingDetailsEntity,
  BookingEntity,
  BookingInvitationEntity,
  PriceAlertEntity,
  SlotReservationEntity,
  WaitlistEntity,
} from './entities';
import { BookingPaymentEventListener } from './listeners/booking-payment-event.listener';
import { BookingRepository } from './repositories';
import { BookingService } from './services';

@Module({
  imports: [
    PropertyModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingDetailsEntity,
      WaitlistEntity,
      SlotReservationEntity,
      BookingInvitationEntity,
      PriceAlertEntity,
    ]),
    PaymentModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingPaymentEventListener,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
