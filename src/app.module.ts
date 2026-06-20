import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthModule } from './auth/auth.module';
import { BookingJobsModule } from './bookings/booking-jobs/booking-jobs.module';
import { BookingModule } from './bookings/booking.module';
import { gatewayDefaults, gatewayEnv } from './common/config/gateway.config';
import { EmailModule } from './common/email/email.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RedisClientModule } from './common/redis';
import { HealthController } from './controllers/health.controller';
import { getTypeOrmConfig } from './database';
import { HomeModule } from './home/home.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import { PaymentModule } from './payments/payment.module';
import { PropertyModule } from './properties/property.module';
import { QueuesModule } from './queues/queues.module';
import { ReviewModule } from './reviews/review.module';
import { SeedModule } from './seed/seed.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisClientModule,
    BullModule.forRootAsync({
      inject: ['REDIS_CLIENT'],

      useFactory: (client: Redis) => ({
        connection: client as any,
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        ({
          secret:
            configService.get<string>(gatewayEnv.jwtSecret) ??
            gatewayDefaults.jwt.secret,
          global: true,
          signOptions: {
            expiresIn:
              configService.get<string>(gatewayEnv.jwtExpiresIn) ??
              gatewayDefaults.jwt.expiresIn,
          },
        }) as JwtModuleOptions,
    }),
    QueuesModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    EmailModule,
    AuthModule,
    PropertyModule,
    HomeModule,
    BookingModule,
    PaymentModule,
    BookingJobsModule,
    StorageModule,
    ReviewModule,
    SeedModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
