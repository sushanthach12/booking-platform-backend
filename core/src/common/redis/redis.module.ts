import { RedisModule } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { redisConfig } from './config/redis.config';
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
  ],
  exports: [REDIS_SERVICE],
})
export class RedisClientModule {}
