import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOOKING_REPOSITORY } from '../database';
import { BookingController } from './controllers';
import { BookingService } from './services';
import {
  BookingEntity,
  BookingDetailsEntity,
  WaitlistEntity,
  SlotReservationEntity,
  BookingInvitationEntity,
  PriceAlertEntity,
} from './entities';
import { BookingRepository } from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingDetailsEntity,
      WaitlistEntity,
      SlotReservationEntity,
      BookingInvitationEntity,
      PriceAlertEntity,
    ]),
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
