import { RedisModule } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { createRedisClient, redisConfig } from './config/redis.config';
import { RedisConnectionService } from './redis.conn.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => redisConfig(configService),
    }),
  ],
  providers: [
    RedisConnectionService,
    {
      provide: REDIS_SERVICE,
      useClass: RedisService,
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) =>
        createRedisClient(configService),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_SERVICE, 'REDIS_CLIENT'],
})
export class RedisClientModule {}
