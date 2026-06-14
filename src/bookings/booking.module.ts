import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AVAILABILITY_CHECKER,
  BOOKING_PRICE_CALCULATOR,
  BOOKING_REPOSITORY,
  BOOKING_SERVICE,
} from '../database';
import { PaymentModule } from '../payments/payment.module';
import { PropertyModule } from '../properties/property.module';
import { QueuesModule } from '../queues/queues.module';
import { UserModule } from '../users/user.module';
import { BookingController } from './controllers';
import { HostBookingController } from './host/host-booking.controller';
import { CancellationPolicyService } from './services/cancellation-policy.service';
import { BookingBalanceListener } from './listeners/booking-balance.listener';
import { BookingEmailListener } from './listeners/booking-email.listener';
import { PayoutEmailListener } from './listeners/payout-email.listener';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
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
  controllers: [BookingController, HostBookingController],
  providers: [
    {
      provide: BOOKING_SERVICE,
      useClass: BookingService,
    },
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
    CancellationPolicyService,
    BookingEmailListener,
    BookingBalanceListener,
    PayoutEmailListener,
  ],
  exports: [BOOKING_SERVICE, BOOKING_REPOSITORY, BookingSnapshotService],
})
export class BookingModule {}
