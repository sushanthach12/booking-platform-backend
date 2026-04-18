import { RedisModule } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { redisConfig } from './config/redis.config';
import { RedisConnectionService } from './redis.conn.service';
import { RedisService } from './redis.service';
import { coreEnv } from '../config/core.config';

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
      useFactory: (configService: ConfigService): Redis => {
        const redisUrl = configService.getOrThrow<string>(coreEnv.redisUrl);
        const isTls = redisUrl.startsWith('rediss://');
        return new Redis(redisUrl, {
          tls: isTls ? { rejectUnauthorized: false } : undefined,
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_SERVICE, 'REDIS_CLIENT', RedisConnectionService],
})
export class RedisClientModule {}
