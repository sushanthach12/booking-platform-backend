import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'IRedisService',
      useClass: RedisService,
    },
  ],
  exports: ['IRedisService'],
})
export class RedisModule {}
