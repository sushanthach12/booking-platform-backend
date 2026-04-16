import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthModule } from './auth/auth.module';
import { BookingJobsModule } from './bookings/booking-jobs/booking-jobs.module';
import { BookingModule } from './bookings/booking.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisClientModule } from './common/redis';
import { getTypeOrmConfig } from './database';
import { PaymentModule } from './payments/payment.module';
import { PropertyModule } from './properties/property.module';
import { QueuesModule } from './queues/queues.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => getRedisConnectionOptions(config),
    // }),
    RedisClientModule,
    BullModule.forRootAsync({
      inject: ['REDIS_CLIENT'],
      useFactory: (client: Redis) => ({
        connection: client, // ← reuse same instance
      }),
    }),
    QueuesModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    AuthModule,
    PropertyModule,
    BookingModule,
    PaymentModule,
    BookingJobsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
