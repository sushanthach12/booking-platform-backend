import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { RedisClient } from './redis.client';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisClient,
    {
      provide: REDIS_SERVICE,
      useClass: RedisService,
    },
  ],
  exports: [REDIS_SERVICE],
})
export class RedisModule {}
