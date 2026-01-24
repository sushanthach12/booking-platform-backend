import { RedisModule } from '@nestjs-modules/ioredis';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { gatewayConfig } from './config/gateway.config';
import { servicesConfig } from './config/services.config';
import { GatewayController } from './controllers/gateway.controller';
import { HealthController } from './controllers/health.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ProxyService } from './services/proxy.service';
import { RoutingService } from './services/routing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [gatewayConfig, servicesConfig],
      isGlobal: true,
    }),
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('gateway.httpTimeout') ?? 5000,
        maxRedirects: 5,
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        ({
          secret: configService.get<string>('jwt.secret') ?? 'change-me',
          global: true,
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiresIn') ?? '1h',
          },
        }) as JwtModuleOptions,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url');
        const host = configService.get<string>('redis.host') ?? 'localhost';
        const port = configService.get<number>('redis.port') ?? 6379;

        return {
          type: 'single',
          url: redisUrl ?? `redis://${host}:${port}`,
        };
      },
    }),
  ],
  controllers: [HealthController, GatewayController],
  providers: [
    ProxyService,
    RoutingService,
    CircuitBreakerService,
    JwtAuthGuard,
    RateLimitGuard,
    LoggingInterceptor,
    TimeoutInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule {}
