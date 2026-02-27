import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AVAILABILITY_CHECKER,
  BOOKING_PRICE_CALCULATOR,
  BOOKING_REPOSITORY,
} from '../database';
import { PaymentModule } from '../payments/payment.module';
import { PropertyModule } from '../properties/property.module';
import { QueuesModule } from '../queues/queues.module';
import { UserModule } from '../users/user.module';
import { BookingController } from './controllers';
import {
  BookingEntity,
  BookingInvitationEntity,
  BookingPriceItemEntity,
  BookingSnapshotEntity,
  PriceAlertEntity,
  SlotReservationEntity,
  WaitlistEntity,
} from './entities';
import { BookingRepository } from './repositories';
import {
  AvailabilityCheckerService,
  BookingService,
  BookingSnapshotService,
  DefaultBookingPriceCalculator,
} from './services';

@Module({
  imports: [
    QueuesModule,
    PropertyModule,
    UserModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingSnapshotEntity,
      BookingPriceItemEntity,
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
    BookingSnapshotService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
    {
      provide: BOOKING_PRICE_CALCULATOR,
      useClass: DefaultBookingPriceCalculator,
    },
    {
      provide: AVAILABILITY_CHECKER,
      useClass: AvailabilityCheckerService,
    },
  ],
  exports: [BookingService, BookingSnapshotService],
})
export class BookingModule {}
