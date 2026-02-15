import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './bookings/booking.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisModule } from './common/redis';
import { getTypeOrmConfig } from './database';
import { PaymentModule } from './payments/payment.module';
import { PropertyModule } from './properties/property.module';
import { QueuesModule } from './queues/queues.module';
import { BookingJobsModule } from './bookings/booking-jobs/booking-jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (url) {
          return { connection: { url } };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST') ?? 'localhost',
            port: config.get<number>('REDIS_PORT') ?? 6379,
          },
        };
      },
    }),
    QueuesModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    RedisModule,

    AuthModule,
    PropertyModule,
    BookingModule,
    PaymentModule,
    BookingJobsModule,
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
