import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { parseNumber } from './config/config.utils';
import { gatewayDefaults, gatewayEnv } from './config/gateway.config';
import { GatewayController } from './controllers/gateway.controller';
import { HealthController } from './controllers/health.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { RedisClientModule } from './redis/redis.module';
import { ProxyService } from './services/proxy.service';
import { RoutingService } from './services/routing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeout = parseNumber(
          configService.get<string>(gatewayEnv.httpTimeout),
          gatewayDefaults.httpTimeout,
        );
        return {
          timeout,
          maxRedirects: 5,
        };
      },
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
    RedisClientModule,
  ],
  controllers: [HealthController, GatewayController],
  providers: [
    ProxyService,
    RoutingService,
    JwtAuthGuard,
    RateLimitGuard,
    LoggingInterceptor,
    TimeoutInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule {}
