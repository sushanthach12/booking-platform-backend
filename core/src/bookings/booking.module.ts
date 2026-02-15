import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOOKING_REPOSITORY } from '../database';
import { PaymentModule } from '../payments/payment.module';
import { PropertyModule } from '../properties/property.module';
import { QueuesModule } from '../queues/queues.module';
import { BookingController } from './controllers';
import {
  BookingDetailsEntity,
  BookingEntity,
  BookingInvitationEntity,
  PriceAlertEntity,
  SlotReservationEntity,
  WaitlistEntity,
} from './entities';
import { BookingRepository } from './repositories';
import { BookingDetailsService, BookingService } from './services';

@Module({
  imports: [
    QueuesModule,
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
    BookingDetailsService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService, BookingDetailsService],
})
export class BookingModule {}
